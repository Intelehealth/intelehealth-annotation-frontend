export interface Customer {
  id: string
  name: string
  logo: string
  description: string
}

export const customersData: Customer[] = [
  {
    id: '1',
    name: 'Leading AI Lab',
    logo: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=AI+Lab',
    description: 'Training frontier models with high-quality annotated data'
  },
  {
    id: '2',
    name: 'Healthcare Institute',
    logo: 'https://via.placeholder.com/150/00FF00/FFFFFF?text=Health',
    description: 'Improving patient outcomes with medical data annotation'
  },
  {
    id: '3',
    name: 'Automotive Company',
    logo: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Auto',
    description: 'Building autonomous vehicles with precise sensor data'
  },
  {
    id: '4',
    name: 'Research University',
    logo: 'https://via.placeholder.com/150/FFFF00/000000?text=Research',
    description: 'Advancing AI research with quality training datasets'
  },
  {
    id: '5',
    name: 'Tech Enterprise',
    logo: 'https://via.placeholder.com/150/FF00FF/FFFFFF?text=Tech',
    description: 'Scaling AI operations across products and services'
  },
  {
    id: '6',
    name: 'Robotics Startup',
    logo: 'https://via.placeholder.com/150/00FFFF/000000?text=Robotics',
    description: 'Training robotic systems with real-world annotated data'
  },
  {
    id: '7',
    name: 'NLP Company',
    logo: 'https://via.placeholder.com/150/800080/FFFFFF?text=NLP',
    description: 'Building language models with multilingual annotations'
  },
  {
    id: '8',
    name: 'Vision AI',
    logo: 'https://via.placeholder.com/150/FFA500/FFFFFF?text=Vision',
    description: 'Computer vision applications with pixel-perfect labels'
  }
]
