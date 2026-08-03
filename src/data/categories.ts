export interface Category {
  id: string
  title: string
  subtitle: string
  image: string
  link: string
}

export const categoriesData: Category[] = [
  {
    id: 'research',
    title: 'Artificial Intelligence',
    subtitle: 'Research',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=2000&h=1500&fit=crop',
    link: '/landing#research'
  },
  {
    id: 'medicine',
    title: 'Healthcare',
    subtitle: 'Medicine',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=2000&h=1500&fit=crop',
    link: '/landing#healthcare'
  },
  {
    id: 'decisions',
    title: 'Data Science',
    subtitle: 'Insights',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=2000&h=1500&fit=crop',
    link: '/landing#data-science'
  },
  {
    id: 'nlp',
    title: 'Natural Language',
    subtitle: 'Processing',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=2000&h=1500&fit=crop',
    link: '/landing#nlp'
  },
  {
    id: 'vision',
    title: 'Computer Vision',
    subtitle: 'Recognition',
    image: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=2000&h=1500&fit=crop',
    link: '/landing#vision'
  },
  {
    id: 'robotics',
    title: 'Robotics',
    subtitle: 'Automation',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=2000&h=1500&fit=crop',
    link: '/landing#robotics'
  },
  {
    id: 'autonomous',
    title: 'Autonomous Systems',
    subtitle: 'Navigation',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=2000&h=1500&fit=crop',
    link: '/landing#autonomous'
  },
  {
    id: 'speech',
    title: 'Speech Recognition',
    subtitle: 'Audio',
    image: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=2000&h=1500&fit=crop',
    link: '/landing#speech'
  }
]
