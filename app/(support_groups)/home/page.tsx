import React from 'react'
import SupportGroupCard from '@/features/support_groups/components/Card'

const home = () => {
  return (
    <div className="p-6">
      <SupportGroupCard
        title="Diabetes Support Group Whitefield"
        imageSrc="/images/group-thumb.png"
        description="A supportive community for people managing diabetes in the Whitefield area."
        rating={4.9}
        reviews={345}
        updatedText="Updated 2 hours ago"
        members={1850}
        experts={12}
        avatars={[
          { src: '/avatars/omar.png', alt: 'Omar Darboe' },
          { src: '/avatars/fran.png', alt: 'Fran Perez' },
          { src: '/avatars/jane.png', alt: 'Jane Rotanson' },
        ]}
        ctaText="Join Group"
      />
    </div>
  )
}

export default home