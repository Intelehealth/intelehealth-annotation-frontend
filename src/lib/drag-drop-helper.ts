import { AnnotationField, AnnotationConfig } from '@/lib/api/csv-imports';

export interface DragDropResult {
  success: boolean;
  message: string;
  updatedFields?: AnnotationField[];
  updatedMetadataFields?: AnnotationField[];
  error?: string;
}

export interface DragDropParams {
  draggedField: string;
  targetFieldName: string;
  targetPanel: 'metadata' | 'annotation';
  annotationConfig: AnnotationConfig;
  orderedMetadataFields: AnnotationField[];
}

/**
 * Comprehensive drag-and-drop handler for field reordering and cross-panel moves
 * Handles all edge cases and provides clear feedback
 */
export class DragDropHelper {
  /**
   * Main entry point for all drag-and-drop operations
   */
  static async handleDragDrop(params: DragDropParams): Promise<DragDropResult> {
    const { draggedField, targetFieldName, targetPanel, annotationConfig, orderedMetadataFields } = params;

    try {
      // Validate basic requirements
      if (!draggedField || !annotationConfig) {
        return {
          success: false,
          message: 'Missing required parameters for drag operation',
          error: 'INVALID_PARAMS'
        };
      }

      // Find the dragged field data
      const draggedFieldData = annotationConfig.annotationFields.find(f => f.csvColumnName === draggedField);
      if (!draggedFieldData) {
        return {
          success: false,
          message: 'Dragged field not found in configuration',
          error: 'FIELD_NOT_FOUND'
        };
      }

      // Determine operation type
      const operationType = this.determineOperationType(draggedFieldData, targetPanel, targetFieldName);

      console.log('DragDropHelper - Operation type:', operationType);

      // Execute the appropriate operation
      switch (operationType) {
        case 'CROSS_PANEL_METADATA_TO_ANNOTATION':
          return this.handleCrossPanelMove(draggedFieldData, 'metadata-to-annotation', annotationConfig, orderedMetadataFields);

        case 'CROSS_PANEL_ANNOTATION_TO_METADATA':
          return this.handleCrossPanelMove(draggedFieldData, 'annotation-to-metadata', annotationConfig, orderedMetadataFields);

        case 'INTERNAL_METADATA_REORDER':
          return this.handleInternalReorder(draggedFieldData, targetFieldName, 'metadata', annotationConfig, orderedMetadataFields);

        case 'INTERNAL_ANNOTATION_REORDER':
          return this.handleInternalReorder(draggedFieldData, targetFieldName, 'annotation', annotationConfig, orderedMetadataFields);

        default:
          return {
            success: false,
            message: 'Unknown drag operation type',
            error: 'UNKNOWN_OPERATION'
          };
      }
    } catch (error) {
      console.error('DragDropHelper error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred during drag operation',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Determines the type of drag operation based on field properties and target
   */
  private static determineOperationType(
    draggedField: AnnotationField,
    targetPanel: 'metadata' | 'annotation',
    targetFieldName: string
  ): string {
    const isCrossPanelMove = 
      (targetPanel === 'annotation' && !draggedField.isAnnotationField) ||
      (targetPanel === 'metadata' && draggedField.isAnnotationField);

    if (isCrossPanelMove) {
      if (targetPanel === 'annotation') {
        return 'CROSS_PANEL_METADATA_TO_ANNOTATION';
      } else {
        return 'CROSS_PANEL_ANNOTATION_TO_METADATA';
      }
    } else {
      if (targetPanel === 'metadata') {
        return 'INTERNAL_METADATA_REORDER';
      } else {
        return 'INTERNAL_ANNOTATION_REORDER';
      }
    }
  }

  /**
   * Handles cross-panel moves (metadata ↔ annotation)
   */
  private static handleCrossPanelMove(
    draggedField: AnnotationField,
    direction: 'metadata-to-annotation' | 'annotation-to-metadata',
    annotationConfig: AnnotationConfig,
    orderedMetadataFields: AnnotationField[]
  ): DragDropResult {
    // Validation based on direction
    if (direction === 'metadata-to-annotation') {
      // Prevent moving primary keys to annotation panel
      if (draggedField.isPrimaryKey) {
        return {
          success: false,
          message: 'Primary key fields cannot be moved to annotation panel',
          error: 'PRIMARY_KEY_RESTRICTION'
        };
      }

      // Update field to become annotation field
      const updatedFields = annotationConfig.annotationFields.map((field) => {
        if (field.csvColumnName === draggedField.csvColumnName) {
          return {
            ...field,
            isAnnotationField: true,
            isPrimaryKey: false, // Ensure it's not a primary key
          };
        }
        return field;
      });

      // Filter metadata fields (exclude annotation fields and new columns)
      const updatedMetadataFields = updatedFields.filter((field) => !field.isAnnotationField);

      return {
        success: true,
        message: `"${draggedField.fieldName}" moved to annotation panel`,
        updatedFields,
        updatedMetadataFields
      };

    } else { // annotation-to-metadata
      // Prevent moving new columns back to metadata panel
      if (draggedField.isNewColumn) {
        return {
          success: false,
          message: 'New columns cannot be moved back to metadata panel',
          error: 'NEW_COLUMN_RESTRICTION'
        };
      }

      // Update field to become metadata field
      const updatedFields = annotationConfig.annotationFields.map((field) => {
        if (field.csvColumnName === draggedField.csvColumnName) {
          return {
            ...field,
            isAnnotationField: false,
          };
        }
        return field;
      });

      // Filter metadata fields (exclude annotation fields and new columns)
      const updatedMetadataFields = updatedFields.filter((field) => !field.isAnnotationField);

      return {
        success: true,
        message: `"${draggedField.fieldName}" moved to metadata panel`,
        updatedFields,
        updatedMetadataFields
      };
    }
  }

  /**
   * Handles internal reordering within panels
   */
  private static handleInternalReorder(
    draggedField: AnnotationField,
    targetFieldName: string,
    panel: 'metadata' | 'annotation',
    annotationConfig: AnnotationConfig,
    orderedMetadataFields: AnnotationField[]
  ): DragDropResult {
    // Prevent self-drop
    if (draggedField.csvColumnName === targetFieldName) {
      return {
        success: false,
        message: 'Cannot drop field on itself',
        error: 'SELF_DROP'
      };
    }

    if (panel === 'metadata') {
      return this.reorderMetadataFields(draggedField, targetFieldName, orderedMetadataFields);
    } else {
      return this.reorderAnnotationFields(draggedField, targetFieldName, annotationConfig);
    }
  }

  /**
   * Reorders fields within the metadata panel
   */
  private static reorderMetadataFields(
    draggedField: AnnotationField,
    targetFieldName: string,
    orderedMetadataFields: AnnotationField[]
  ): DragDropResult {
    // Find indices
    const draggedIndex = orderedMetadataFields.findIndex(field => field.csvColumnName === draggedField.csvColumnName);
    const targetIndex = orderedMetadataFields.findIndex(field => field.csvColumnName === targetFieldName);

    if (draggedIndex === -1 || targetIndex === -1) {
      return {
        success: false,
        message: 'Could not find dragged or target field in metadata list',
        error: 'FIELD_NOT_IN_METADATA'
      };
    }

    // Create new ordered array
    const newOrder = [...orderedMetadataFields];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    return {
      success: true,
      message: 'Metadata fields reordered successfully',
      updatedMetadataFields: newOrder
    };
  }

  /**
   * Reorders fields within the annotation panel
   */
  private static reorderAnnotationFields(
    draggedField: AnnotationField,
    targetFieldName: string,
    annotationConfig: AnnotationConfig
  ): DragDropResult {
    // Get all annotation fields
    const allFields = [...annotationConfig.annotationFields];
    
    // Find indices in the full array
    const draggedFieldIndex = allFields.findIndex((field) => field.csvColumnName === draggedField.csvColumnName);
    const targetFieldIndex = allFields.findIndex((field) => field.csvColumnName === targetFieldName);

    if (draggedFieldIndex === -1 || targetFieldIndex === -1) {
      return {
        success: false,
        message: 'Could not find dragged or target field in annotation configuration',
        error: 'FIELD_NOT_IN_ANNOTATION'
      };
    }

    // Ensure both fields are annotation fields
    const draggedFieldData = allFields[draggedFieldIndex];
    const targetFieldData = allFields[targetFieldIndex];

    if (!draggedFieldData.isAnnotationField || !targetFieldData.isAnnotationField) {
      return {
        success: false,
        message: 'Both fields must be annotation fields to reorder',
        error: 'INVALID_FIELD_TYPE'
      };
    }

    // IMPORTANT: Allow reordering of ALL annotation fields, including primary keys and new columns
    // This enables users to reorder any field within the annotation panel
    
    // Perform the reorder
    const updatedFields = [...allFields];
    const [draggedItem] = updatedFields.splice(draggedFieldIndex, 1);
    updatedFields.splice(targetFieldIndex, 0, draggedItem);

    console.log('Reordering annotation fields:', {
      draggedField: draggedFieldData.fieldName,
      targetField: targetFieldData.fieldName,
      draggedIsPrimary: draggedFieldData.isPrimaryKey,
      draggedIsNewColumn: draggedFieldData.isNewColumn,
      targetIsPrimary: targetFieldData.isPrimaryKey,
      targetIsNewColumn: targetFieldData.isNewColumn
    });

    return {
      success: true,
      message: 'Annotation fields reordered successfully',
      updatedFields
    };
  }

  /**
   * Validates if a field can be dragged
   */
  static canDragField(field: AnnotationField, sourcePanel: 'metadata' | 'annotation'): { canDrag: boolean; reason?: string } {
    if (sourcePanel === 'metadata') {
      // In metadata panel, all fields can be dragged for reordering
      // Primary keys can be reordered within metadata panel, just can't move to annotation panel
      return { canDrag: true };
    } else {
      // In annotation panel, all fields can be dragged for reordering
      // New columns can be reordered within annotation panel, just can't move to metadata panel
      return { canDrag: true };
    }
  }

  /**
   * Validates if a field can be dropped on
   */
  static canDropOnField(targetField: AnnotationField, draggedField: AnnotationField): { canDrop: boolean; reason?: string } {
    // Cannot drop on itself
    if (targetField.csvColumnName === draggedField.csvColumnName) {
      return { canDrop: false, reason: 'Cannot drop field on itself' };
    }

    // Can always drop for reordering within the same panel
    return { canDrop: true };
  }

  /**
   * Gets user-friendly drag restrictions message
   */
  static getDragRestrictionMessage(field: AnnotationField, sourcePanel: 'metadata' | 'annotation'): string | null {
    // All fields can be dragged for reordering within their panels
    // Restrictions only apply to cross-panel moves
    return null;
  }
}
