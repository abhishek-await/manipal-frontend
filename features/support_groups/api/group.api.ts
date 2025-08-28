import { SupportGroupCardProps as Card} from "../components/Card";

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

  searchGroup: async (query: string) => {
    const response = await fetch(`${API_BASE_URL}/support-groups/groups/search?query=${encodeURIComponent(query)}`,{
        method: "GET",
        headers: {
            'Content-Type': 'application/json',
        }
    })

    if(!response.ok){
        throw new Error("Search failed")
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
  }
};
