import { z } from 'zod';

// Dataset types matching project types
const datasetTypes = ['text', 'image', 'audio', 'multimodal'] as const;

// Access types
const accessTypes = ['private', 'public'] as const;

// Create dataset validation schema
export const createDatasetSchema = z.object({
  name: z
    .string()
    .min(2, 'Dataset name must be at least 2 characters')
    .max(100, 'Dataset name must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Dataset name can only contain letters, numbers, spaces, hyphens, and underscores',
    ),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  datasetType: z
    .enum(datasetTypes, {
      message: 'Please select a valid dataset type',
    })
    .refine((val) => val !== undefined, {
      message: 'Dataset type is required',
    }),
  accessType: z
    .enum(accessTypes, {
      message: 'Please select a valid access type',
    }),
});

// Type exports
export type CreateDatasetFormData = z.infer<typeof createDatasetSchema>;
export type DatasetType = (typeof datasetTypes)[number];
export type AccessType = (typeof accessTypes)[number];
