import { SupportGroupCardProps as Card} from "../components/Card";
import { authApi } from "@/features/auth/api/auth.api";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const groupApi = {
  getGroups: async (access: string) => {
    console.log("Access: ", access)
    const response = await fetch(`${API_BASE_URL}/support-groups/groups/`,{
        method: "GET",
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access}`
        },
        cache: "no-store"
    })

    if (!response.ok) {
      throw new Error('Failed to get groups');
    }

    const groups = await response.json()

    return groups.map((g:any): Card => ({
        id: g.id,
        title: g.title,
        description: g.description,
        imageSrc: '/images/group-thumb.png',
        rating: Number(g.rating),
        updatedText: g.updated_at,
        members: g.total_members,
        experts: g.total_experts,
        avatars: [
          { src: '/avatars/omar.png', alt: 'Omar Darboe' },
          { src: '/avatars/fran.png', alt: 'Fran Perez' },
          { src: '/avatars/jane.png', alt: 'Jane Rotanson' },
        ],
        category: {id: g.category.id , name: g.category.name},
        totalPosts: g.total_posts,
        growthPercentage: g.growth_percentage,
        isMember: g.is_member
    }))
  },

  searchGroup: async (query: string, options?: { signal?: AbortSignal }) => {
    const response = await fetch(
      `${API_BASE_URL}/support-groups/groups/search?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: options?.signal,
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error("Search failed");
    }

    const groups = await response.json();

    return groups.map((g: any): Card => ({
      id: g.id,
      title: g.title,
      description: g.description,
      imageSrc: "/images/group-thumb.png",
      rating: Number(g.rating),
      updatedText: g.updated_at,
      members: g.total_members,
      experts: g.total_experts,
      avatars: [
        { src: "/avatars/omar.png", alt: "Omar Darboe" },
        { src: "/avatars/fran.png", alt: "Fran Perez" },
        { src: "/avatars/jane.png", alt: "Jane Rotanson" },
      ],
      category: { id: g.category.id, name: g.category.name },
      totalPosts: g.total_posts,
      growthPercentage: g.growth_percentage,
    }));
  },

  joinGroup: async (id: string) => {
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/support-groups/groups/${id}/join/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Error joining group: ${res.status} ${text}`)
    }

    return res.json()
  },

  leaveGroup: async (id: string) => { 
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/support-groups/groups/${id}/leave/`,{
      method: "DELETE",
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Error leaving group: ${res.status} ${text}`)
    }

    return res.json()
  },

  listMembers: async (id: string) => {
    // endpoint path: /support-groups/groups/{id}/members
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/support-groups/groups/${id}/members/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json',},
      cache: "no-store"
    }).catch(async (err) => {
      // If fetchWithAuth throws (no tokens or refresh failed), attempt unauthenticated fetch
      // so we still get public members list where applicable.
      try {
        const r = await fetch(`${API_BASE_URL}/support-groups/groups/${id}/members/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!r.ok) throw new Error('Error fetching members')
        return r
      } catch (e) {
        console.error(e)
        throw err // rethrow original
      }
    })

    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`Error fetching members: ${res.status} ${t}`)
    }

    return res.json() // should be an array of user objects
  },

  getGroup: async (id: string, access: string) => {
    const res = await fetch(`${API_BASE_URL}/support-groups/groups/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access}`
      },
      cache: "no-store"
    })

    if(!res.ok){
      throw new Error(`Error fetching group`)
    }

    return res.json()
  },

  likePost: async (postId: string) => {
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/support-groups/posts/${postId}/like/`,{
      method: "POST",
      headers: { 'Content-Type': 'application/json',},
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Error liking post: ${res.status} ${text}`)
    }

    return res.json()
  },

  // features/support_groups/api/group.api.ts (replace createPost implementation)
  // features/support_groups/api/group.api.ts
  createPost: async (
    groupId: string,
    data: { title?: string; content: string; category?: number[]; tag?: string; files?: File[] }
  ) => {
    const url = `${API_BASE_URL}/support-groups/posts/${groupId}/post/`;

    console.log("[CreatePost] Data: ", data)

    // Always send as multipart/form-data per your swagger UI
    const fd = new FormData();

    // Build the post object exactly as the API expects in `post_in`
    const postObj: any = {
      // include only fields expected by backend
      title: data.title ?? "",
      content: data.content ?? "",
      category: Array.isArray(data.category) ? data.category : [],
    };

    // If you have other keys that backend expects inside post_in, add them here
    // e.g. postObj.tag = data.tag ?? "";

    // Append post_in as JSON string (server should parse it)
    // Some servers accept a file blob with application/json; string is fine for most.
    fd.append("post_in", JSON.stringify(postObj));

    // Append files (append the same key multiple times -> array on server)
    if (data.files && data.files.length > 0) {
      data.files.forEach((f) => {
        // Use key name "files" to match swagger field name "files"
        fd.append("files", f, f.name);
      });
    }

    console.log("[CreatePost] Form Data: ", fd)

    const res = await authApi.fetchWithAuth(url, {
      method: "POST",
      // DO NOT set Content-Type header; browser will set the multipart boundary
      body: fd,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Error creating post: ${res.status} ${text}`);
    }

    return res.json();
  },

  getPost: async (postId: string) => {
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/support-group/posts/${postId}`,{
      method: "GET",
      headers: { 'Content-Type': 'application/json'},
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Error getting post: ${res.status} ${text}`)
    }

    return res.json()
  },

  getReplies: async (postId: string) => {
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/support-groups/posts/${postId}/replies`,{
      method: "GET",
      headers: { 'Content-Type': 'application/json'},
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Error getting replies: ${res.status} ${text}`)
    }

    return res.json()
  },

  postReply: async (postId: string, data: {content: string, parent_id?: number}) => {
    console.log("Body: ", JSON.stringify(data))
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/support-groups/posts/${postId}/reply/`,{
      method: "POST",
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify(data) 
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Error replying to post: ${res.status} ${text}`)
    }


    console.log("Response: ", res)

    return res.json()

  },
  
  getPosts: async (groupId: string) => {
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/support-groups/groups/${groupId}/posts`,{
      method: "GET",
      headers: { 'Content-Type': 'application/json'},
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Error fetching posts: ${res.status} ${text}`)
    }

    return res.json()
  },

  getPostCategories: async () => {
    const res = await fetch(`${API_BASE_URL}/support-groups/posts/categories/`,{
      method: "GET",
      headers: {
        'Content-Type': 'application/json'
      }
    })
    if(!res.ok){
      throw new Error("Error fetching post categories")
    }

    const dummyData = [{
      id: 0,
      name: "Medication",
      description: "Discussions on prescribed medicines, therapies or treatments"
    }]

    return dummyData

  }
};
