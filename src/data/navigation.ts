export interface NavItem {
  label: string
  href: string
  children?: { label: string; href: string; description?: string }[]
}

export const navigationData: NavItem[] = [
  {
    label: 'Products',
    href: '/dashboard',
    children: [
      { label: 'Data Engine', href: '/dashboard', description: 'Scalable annotation pipeline' },
      { label: 'Annotation Tools', href: '/documentation', description: 'Multi-modal labeling suite' },
      { label: 'Consensus Engine', href: '/dashboard', description: 'Quality control & reviews' },
      { label: 'Export Studio', href: '/dashboard', description: 'Dataset export & formats' }
    ]
  },
  {
    label: 'Solutions',
    href: '/dashboard',
    children: [
      { label: 'Autonomous Vehicles', href: '/landing#vehicles', description: 'Sensor & LiDAR annotation' },
      { label: 'Computer Vision', href: '/landing#vision', description: 'Image & video labeling' },
      { label: 'NLP', href: '/landing#nlp', description: 'Text & language annotation' },
      { label: 'Healthcare', href: '/landing#healthcare', description: 'Medical imaging labels' }
    ]
  },
  {
    label: 'Resources',
    href: '/documentation',
    children: [
      { label: 'Blog', href: '/documentation', description: 'Latest updates' },
      { label: 'Documentation', href: '/documentation', description: 'Guides & API refs' },
      { label: 'Events', href: '/documentation', description: 'Upcoming webinars' }
    ]
  }
]
