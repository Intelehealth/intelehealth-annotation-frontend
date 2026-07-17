import { AnnotationField, AnnotationConfig } from '@/lib/api/csv-imports';

export interface DragDropResult {
  success: boolean;
  message: string;
  updatedFields?: AnnotationField[];
  updatedMetadataFields?: AnnotationField[];
  error?: string;
  changedPanels?: boolean;
}

export interface DragDropParams {
  draggedField: string;
  targetFieldName: string;
  targetPanel: 'metadata' | 'annotation';
  annotationConfig: AnnotationConfig;
  orderedMetadataFields: AnnotationField[];
}

/**
 * Drag-and-drop handler for field reordering and cross-panel moves.
 * CSV fields are MOVED (not linked) — one field, one location at a time.
 */
export class DragDropHelper {
  /**
   * Main entry point for all drag-and-drop operations
   */
  static async handleDragDrop(params: DragDropParams): Promise<DragDropResult> {
    const { draggedField, targetFieldName, targetPanel, annotationConfig, orderedMetadataFields } = params;

    try {
      if (!draggedField || !annotationConfig) {
        return { success: false, message: 'Missing required parameters for drag operation', error: 'INVALID_PARAMS' };
      }

      const draggedFieldData = annotationConfig.annotationFields.find(f => f.csvColumnName === draggedField);
      if (!draggedFieldData) {
        return { success: false, message: 'Dragged field not found in configuration', error: 'FIELD_NOT_FOUND' };
      }

      // Prevent self-drop
      if (draggedFieldData.csvColumnName === targetFieldName && targetPanel === 'metadata') {
        return { success: false, message: 'Cannot drop field on itself', error: 'SELF_DROP' };
      }

      // Check if field is already mapped to annotation panel
      if (targetPanel === 'annotation' && !draggedFieldData.isAnnotationField) {
        const alreadyMapped = annotationConfig.annotationFields.some(
          f => f.csvColumnName === draggedFieldData.csvColumnName && f.isAnnotationField
        );
        if (alreadyMapped) {
          return {
            success: false,
            message: `"${draggedFieldData.fieldName}" is already in the Annotation Workbench.`,
            error: 'ALREADY_MAPPED'
          };
        }
      }

      const operationType = this.determineOperationType(draggedFieldData, targetPanel, targetFieldName);

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
          return { success: false, message: 'Unknown drag operation type', error: 'UNKNOWN_OPERATION' };
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
      return targetPanel === 'annotation'
        ? 'CROSS_PANEL_METADATA_TO_ANNOTATION'
        : 'CROSS_PANEL_ANNOTATION_TO_METADATA';
    }

    return targetPanel === 'metadata' ? 'INTERNAL_METADATA_REORDER' : 'INTERNAL_ANNOTATION_REORDER';
  }

  /**
   * Handles cross-panel moves (metadata ↔ annotation)
   * All fields use the same toggle mechanism — no special "link" behavior.
   */
  private static handleCrossPanelMove(
    draggedField: AnnotationField,
    direction: 'metadata-to-annotation' | 'annotation-to-metadata',
    annotationConfig: AnnotationConfig,
    orderedMetadataFields: AnnotationField[]
  ): DragDropResult {
    if (direction === 'metadata-to-annotation') {
      if (draggedField.isPrimaryKey) {
        return { success: false, message: 'Primary key fields cannot be moved to annotation panel', error: 'PRIMARY_KEY_RESTRICTION' };
      }

      const updatedFields = annotationConfig.annotationFields.map((field) => {
        if (field.csvColumnName === draggedField.csvColumnName) {
          return { ...field, isAnnotationField: true, isPrimaryKey: false };
        }
        return field;
      });

      const updatedMetadataFields = updatedFields.filter((field) => !field.isNewColumn && !field.isAnnotationField);

      return {
        success: true,
        message: `"${draggedField.fieldName}" moved to annotation panel`,
        updatedFields,
        updatedMetadataFields,
        changedPanels: true
      };

    } else {
      if (draggedField.isNewColumn) {
        return { success: false, message: 'New columns cannot be moved back to metadata panel', error: 'NEW_COLUMN_RESTRICTION' };
      }

      const updatedFields = annotationConfig.annotationFields.map((field) => {
        if (field.csvColumnName === draggedField.csvColumnName) {
          return { ...field, isAnnotationField: false };
        }
        return field;
      });

      const updatedMetadataFields = updatedFields.filter((field) => !field.isNewColumn && !field.isAnnotationField);

      return {
        success: true,
        message: `"${draggedField.fieldName}" moved to metadata panel`,
        updatedFields,
        updatedMetadataFields,
        changedPanels: true
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
    if (draggedField.csvColumnName === targetFieldName) {
      return { success: false, message: 'Cannot drop field on itself', error: 'SELF_DROP' };
    }

    if (panel === 'metadata') {
      return this.reorderMetadataFields(draggedField, targetFieldName, orderedMetadataFields);
    }
    return this.reorderAnnotationFields(draggedField, targetFieldName, annotationConfig);
  }

  /**
   * Reorders fields within the metadata panel
   */
  private static reorderMetadataFields(
    draggedField: AnnotationField,
    targetFieldName: string,
    orderedMetadataFields: AnnotationField[]
  ): DragDropResult {
    const draggedIndex = orderedMetadataFields.findIndex(field => field.csvColumnName === draggedField.csvColumnName);
    const targetIndex = orderedMetadataFields.findIndex(field => field.csvColumnName === targetFieldName);

    if (draggedIndex === -1 || targetIndex === -1) {
      return { success: false, message: 'Could not find dragged or target field in metadata list', error: 'FIELD_NOT_IN_METADATA' };
    }

    const newOrder = [...orderedMetadataFields];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    return { success: true, message: 'Metadata fields reordered successfully', updatedMetadataFields: newOrder };
  }

  /**
   * Reorders fields within the annotation panel
   */
  private static reorderAnnotationFields(
    draggedField: AnnotationField,
    targetFieldName: string,
    annotationConfig: AnnotationConfig
  ): DragDropResult {
    const allFields = [...annotationConfig.annotationFields];
    const draggedFieldIndex = allFields.findIndex((field) => field.csvColumnName === draggedField.csvColumnName);
    const targetFieldIndex = allFields.findIndex((field) => field.csvColumnName === targetFieldName);

    if (draggedFieldIndex === -1 || targetFieldIndex === -1) {
      return { success: false, message: 'Could not find dragged or target field in annotation configuration', error: 'FIELD_NOT_IN_ANNOTATION' };
    }

    const draggedFieldData = allFields[draggedFieldIndex];
    const targetFieldData = allFields[targetFieldIndex];

    if (!draggedFieldData.isAnnotationField || !targetFieldData.isAnnotationField) {
      return { success: false, message: 'Both fields must be annotation fields to reorder', error: 'INVALID_FIELD_TYPE' };
    }

    const updatedFields = [...allFields];
    const [draggedItem] = updatedFields.splice(draggedFieldIndex, 1);
    updatedFields.splice(targetFieldIndex, 0, draggedItem);

    return { success: true, message: 'Annotation fields reordered successfully', updatedFields };
  }

  /**
   * Validates if a field can be dragged from a source panel
   */
  static canDragField(field: AnnotationField, sourcePanel: 'metadata' | 'annotation'): { canDrag: boolean; reason?: string } {
    if (sourcePanel === 'metadata') {
      if (field.isPrimaryKey) return { canDrag: false, reason: 'Primary key cannot be moved' };
      return { canDrag: true };
    }
    if (field.isNewColumn) return { canDrag: false, reason: 'New columns stay in annotation' };
    return { canDrag: true };
  }

  /**
   * Validates if a field can be dropped on a target field
   */
  static canDropOnField(targetField: AnnotationField, draggedField: AnnotationField): { canDrop: boolean; reason?: string } {
    if (targetField.csvColumnName === draggedField.csvColumnName) {
      return { canDrop: false, reason: 'Cannot drop field on itself' };
    }
    return { canDrop: true };
  }

  /**
   * Gets user-friendly drag restrictions message
   */
  static getDragRestrictionMessage(field: AnnotationField, sourcePanel: 'metadata' | 'annotation'): string | null {
    if (sourcePanel === 'metadata' && !field.isPrimaryKey) {
      return 'Drag to annotation panel to add this field';
    }
    return null;
  }
}