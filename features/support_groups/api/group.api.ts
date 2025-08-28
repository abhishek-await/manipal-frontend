import { SupportGroupCardProps as Card} from "../components/Card";
import { authApi } from "@/features/auth/api/auth.api";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const groupApi = {
  getGroups: async () => {
    const response = await fetch(`${API_BASE_URL}/support-groups/groups`,{
        method: "GET",
        headers: {
            'Content-Type': 'application/json',
        }
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
        growthPercentage: g.growth_percentage
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
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/support-groups/groups/${id}/join`, {
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
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/support-groups/groups/${id}/leave`,{
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
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/support-groups/groups/${id}/members`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }).catch(async (err) => {
      // If fetchWithAuth throws (no tokens or refresh failed), attempt unauthenticated fetch
      // so we still get public members list where applicable.
      try {
        const r = await fetch(`${API_BASE_URL}/support-groups/groups/${id}/members`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!r.ok) throw new Error('Error fetching members')
        return r
      } catch (e) {
        throw err // rethrow original
      }
    })

    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`Error fetching members: ${res.status} ${t}`)
    }

    return res.json() // should be an array of user objects
  },
};
