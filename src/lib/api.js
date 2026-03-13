import { supabase } from './supabase'

// ── Auth ──────────────────────────────────────────────────────
export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── Profile ───────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// ── Cafes ─────────────────────────────────────────────────────
export async function getCafes() {
  const { data, error } = await supabase
    .from('cafes')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

// ── Staff: only cafes this user is assigned to ────────────────
export async function getAssignedCafes() {
  const { data, error } = await supabase
    .from('cafe_staff')
    .select('cafe:cafes(*)')
  if (error) throw error
  return data.map(row => row.cafe)
}

// ── Stamp Cards ───────────────────────────────────────────────
export async function getStampCards(userId) {
  const { data, error } = await supabase
    .from('stamp_cards')
    .select(`
      *,
      cafe:cafes(*)
    `)
    .eq('user_id', userId)
    .order('last_visit', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data
}

export async function getStampCard(userId, cafeId) {
  const { data, error } = await supabase
    .from('stamp_cards')
    .select(`*, cafe:cafes(*)`)
    .eq('user_id', userId)
    .eq('cafe_id', cafeId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

// ── Stamp transaction (called by cafe staff portal) ───────────
export async function addStamp(userId, cafeId) {
  const { data, error } = await supabase.rpc('add_stamp', {
    p_user_id: userId,
    p_cafe_id: cafeId,
  })
  if (error) throw error
  return data
}

// ── Claim reward ──────────────────────────────────────────────
export async function claimReward(userId, cafeId) {
  const { data, error } = await supabase.rpc('claim_reward', {
    p_user_id: userId,
    p_cafe_id: cafeId,
  })
  if (error) throw error
  return data
}

// ── Profile update ────────────────────────────────────────────
export async function updateProfile({ name, bio, avatarUrl }) {
  const { data: { user } } = await supabase.auth.getUser()
  const updates = { name, bio }
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadAvatar(file) {
  const { data: { user } } = await supabase.auth.getUser()
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  const path = `${user.id}/avatar.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${publicUrl}?t=${Date.now()}` // bust cache
}

// ── Posts ─────────────────────────────────────────────────────
// Returns merged activity feed (posts + stamp scans + reward claims) from friends
export async function getFriendsActivity() {
  const { data: { user } } = await supabase.auth.getUser()

  // Get accepted friend IDs
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
  const friendIds = (friendships ?? []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )
  if (!friendIds.length) return []

  const PROFILE = 'profile:profiles(name, avatar_initials, avatar_url)'
  const CAFE = 'cafe:cafes(name, color, logo_letter)'

  const [postsRes, stampsRes, rewardsRes] = await Promise.all([
    supabase
      .from('posts')
      .select(`id, created_at, user_id, caption, emoji, stamp_label, is_reward, media_url, media_type, ${PROFILE}, ${CAFE}`)
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('stamp_events')
      .select(`id, created_at, user_id, ${PROFILE}, ${CAFE}`)
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('reward_claims')
      .select(`id, created_at, user_id, ${PROFILE}, ${CAFE}`)
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const posts   = (postsRes.data   ?? []).map(p => ({ ...p, type: 'post'   }))
  const stamps  = (stampsRes.data  ?? []).map(s => ({ ...s, type: 'stamp'  }))
  const rewards = (rewardsRes.data ?? []).map(r => ({ ...r, type: 'reward' }))

  return [...posts, ...stamps, ...rewards]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 40)
}

export async function getPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profile:profiles(name, avatar_initials, avatar_url),
      cafe:cafes(name, color, logo_letter)
    `)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function createPost({ cafeId, caption, emoji, stampLabel, isReward, mediaUrl, mediaType }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      cafe_id: cafeId || null,
      caption,
      emoji,
      stamp_label: stampLabel || null,
      is_reward: isReward || false,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadPostMedia(file) {
  const { data: { user } } = await supabase.auth.getUser()
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('post-media')
    .upload(path, file, { contentType: file.type })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path)
  return publicUrl
}

export async function getMyLikes(postIds) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !postIds.length) return []
  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', user.id)
    .in('post_id', postIds)
  if (error) throw error
  return data.map(r => r.post_id)
}

export async function toggleLike(postId, currentlyLiked) {
  const { data: { user } } = await supabase.auth.getUser()
  if (currentlyLiked) {
    const { error } = await supabase.from('post_likes').delete()
      .eq('post_id', postId).eq('user_id', user.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('post_likes')
      .insert({ post_id: postId, user_id: user.id })
    if (error) throw error
  }
}

// ── Friends ───────────────────────────────────────────────────
const PROFILE_FIELDS = 'id, name, username, avatar_initials, avatar_url'

export async function searchUsers(query) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .neq('id', user.id)
    .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
    .limit(20)
  if (error) throw error
  return data
}

// Returns all friendships + the current user's id so callers can derive status
export async function getMyFriendships() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id, status, requester_id, addressee_id,
      requester:requester_id(${PROFILE_FIELDS}),
      addressee:addressee_id(${PROFILE_FIELDS})
    `)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
  if (error) throw error
  return { friendships: data, myId: user.id }
}

export async function sendFriendRequest(addresseeId) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeId })
    .select(`id, status, requester_id, addressee_id,
      requester:requester_id(${PROFILE_FIELDS}),
      addressee:addressee_id(${PROFILE_FIELDS})`)
    .single()
  if (error) throw error
  return data
}

export async function respondToRequest(friendshipId, status) {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status })
    .eq('id', friendshipId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function withdrawRequest(friendshipId) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
  if (error) throw error
}

// ── Comments ──────────────────────────────────────────────────
export async function getComments(postId) {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      id, content, created_at, user_id,
      profile:profiles(id, name, username, avatar_initials, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addComment(postId, content) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: user.id, content })
    .select(`
      id, content, created_at, user_id,
      profile:profiles(id, name, username, avatar_initials, avatar_url)
    `)
    .single()
  if (error) throw error
  return data
}

export async function deleteComment(commentId) {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId)
  if (error) throw error
}

export async function deletePost(postId) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
  if (error) throw error
}

// ── Stats ─────────────────────────────────────────────────────
export async function getUserStats(userId) {
  const { data: events } = await supabase
    .from('stamp_events')
    .select('id')
    .eq('user_id', userId)

  const { data: claims } = await supabase
    .from('reward_claims')
    .select('id')
    .eq('user_id', userId)

  const { data: cards } = await supabase
    .from('stamp_cards')
    .select('id')
    .eq('user_id', userId)

  return {
    totalStamps: events?.length ?? 0,
    rewardsEarned: claims?.length ?? 0,
    activeCards: cards?.length ?? 0,
  }
}
