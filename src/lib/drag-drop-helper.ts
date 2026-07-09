import { AnnotationField, AnnotationConfig } from '@/lib/api/csv-imports';

const DATA_FIELD_TYPES = ['image', 'audio', 'video'];

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
 * Comprehensive drag-and-drop handler for field reordering and cross-panel links
 * Data fields (image/audio/video/text metadata) are LINKED to the annotation panel,
 * never duplicated. Only annotation questions (radio, text, rating, dropdown, etc.)
 * create new annotation fields.
 */
export class DragDropHelper {
  /**
   * Checks if a field is a data/source field (not an annotation question)
   */
  static isDataField(field: AnnotationField): boolean {
    return DATA_FIELD_TYPES.includes(field.fieldType) ||
      (field.fieldType === 'text' && !field.isAnnotationField && !field.columnType);
  }

  /**
   * Checks if a data field is already linked to the annotation panel
   */
  static findDataFieldLink(fields: AnnotationField[], sourceCsvColumnName: string): AnnotationField | undefined {
    return fields.find(f => f.isDataFieldLink && f.sourceCsvColumnName === sourceCsvColumnName);
  }

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

      // Execute the appropriate operation
      switch (operationType) {
        case 'LINK_DATA_FIELD_TO_ANNOTATION':
          return this.handleLinkDataField(draggedFieldData, annotationConfig, orderedMetadataFields);

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
        // Check if this is a data field being linked (not a question being moved)
        if (this.isDataField(draggedField)) {
          return 'LINK_DATA_FIELD_TO_ANNOTATION';
        }
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
   * Handles linking a data field to the annotation panel
   * The original data field stays in the metadata panel; a read-only reference is added to annotation
   */
  private static handleLinkDataField(
    draggedField: AnnotationField,
    annotationConfig: AnnotationConfig,
    orderedMetadataFields: AnnotationField[]
  ): DragDropResult {
    // Prevent linking primary keys
    if (draggedField.isPrimaryKey) {
      return {
        success: false,
        message: 'Primary key fields cannot be linked to annotation panel',
        error: 'PRIMARY_KEY_RESTRICTION'
      };
    }

    // Check if this data field is already linked
    const existingLink = this.findDataFieldLink(annotationConfig.annotationFields, draggedField.csvColumnName);
    if (existingLink) {
      return {
        success: false,
        message: `"${draggedField.fieldName}" is already linked to the annotation panel`,
        error: 'DUPLICATE_LINK'
      };
    }

    // Create a link field — a lightweight reference to the source data field
    const linkField: AnnotationField = {
      csvColumnName: draggedField.csvColumnName,
      fieldName: draggedField.fieldName,
      fieldType: draggedField.fieldType,
      isRequired: false,
      isAnnotationField: true,
      isPrimaryKey: false,
      isNewColumn: false,
      isDataFieldLink: true,
      sourceCsvColumnName: draggedField.csvColumnName,
    };

    // Add the link field to the annotation fields array
    const updatedFields = [...annotationConfig.annotationFields, linkField];

    // Metadata display stays the same (data fields remain visible)
    const updatedMetadataFields = orderedMetadataFields;

    return {
      success: true,
      message: `"${draggedField.fieldName}" linked to annotation panel`,
      updatedFields,
      updatedMetadataFields,
      changedPanels: true
    };
  }

  /**
   * Handles cross-panel moves (metadata ↔ annotation)
   * For data fields: metadata-to-annotation creates a link, annotation-to-metadata removes the link
   * For annotation questions: metadata-to-annotation moves the field, annotation-to-metadata moves it back
   */
  private static handleCrossPanelMove(
    draggedField: AnnotationField,
    direction: 'metadata-to-annotation' | 'annotation-to-metadata',
    annotationConfig: AnnotationConfig,
    orderedMetadataFields: AnnotationField[]
  ): DragDropResult {
    // Validation based on direction
    if (direction === 'metadata-to-annotation') {
      // This path only handles annotation questions (data fields go via handleLinkDataField)
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
            isPrimaryKey: false,
          };
        }
        return field;
      });

      // Filter metadata fields (exclude new columns and annotation fields from metadata display)
      const updatedMetadataFields = updatedFields.filter((field) => !field.isNewColumn && !field.isAnnotationField);

      return {
        success: true,
        message: `"${draggedField.fieldName}" moved to annotation panel`,
        updatedFields,
        updatedMetadataFields,
        changedPanels: true
      };

    } else { // annotation-to-metadata
      // Check if this is a data field link being removed
      if (draggedField.isDataFieldLink) {
        // Remove the link entry entirely — the original data field stays in metadata
        const updatedFields = annotationConfig.annotationFields.filter(
          (f) => !(f.isDataFieldLink && f.sourceCsvColumnName === draggedField.sourceCsvColumnName)
        );
        const updatedMetadataFields = updatedFields.filter((field) => !field.isNewColumn && !field.isAnnotationField);

        return {
          success: true,
          message: `"${draggedField.fieldName}" unlinked from annotation panel`,
          updatedFields,
          updatedMetadataFields,
          changedPanels: true
        };
      }

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

      // Filter metadata fields (exclude new columns and annotation fields from metadata display)
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
      // Primary keys can be reordered within metadata panel, just can't link to annotation panel
      return { canDrag: true };
    } else {
      // In annotation panel, data field links can be dragged back to metadata to unlink
      // New columns can be reordered within annotation panel, just can't move to metadata panel
      if (field.isNewColumn && !field.isDataFieldLink) {
        return { canDrag: true };
      }
      // Data field links can be dragged to metadata panel to unlink
      if (field.isDataFieldLink) {
        return { canDrag: true };
      }
      // Regular annotation questions can be reordered
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
    if (sourcePanel === 'metadata' && this.isDataField(field)) {
      // Check if already linked
      return 'Drag to annotation panel to link this data field';
    }
    return null;
  }

  /**
   * Migrates existing duplicated data fields to linked references.
   * Finds data fields (image/audio/video/text metadata) that were previously "moved" to the
   * annotation panel (isAnnotationField: true) and converts them to proper linked references.
   * The original field stays in metadata; a new isDataFieldLink entry is added to annotation.
   */
  static migrateExistingDataFields(fields: AnnotationField[]): {
    migrated: boolean;
    migratedFields: AnnotationField[];
    migrationLog: string[];
  } {
    const log: string[] = [];
    const migratedFields = [...fields];

    // Find data fields that were incorrectly moved to annotation (not linked, not questions)
    const movedDataFields = migratedFields.filter(f =>
      f.isAnnotationField &&
      !f.isNewColumn &&
      !f.isDataFieldLink &&
      this.isDataField(f)
    );

    if (movedDataFields.length === 0) {
      return { migrated: false, migratedFields, migrationLog: log };
    }

    for (const dataField of movedDataFields) {
      log.push(`Migrating "${dataField.fieldName}" from moved annotation to linked reference`);

      // Restore the original data field to metadata panel
      const originalIndex = migratedFields.findIndex(f =>
        f.csvColumnName === dataField.csvColumnName &&
        !f.isDataFieldLink
      );
      if (originalIndex !== -1) {
        const original = { ...migratedFields[originalIndex] };
        original.isAnnotationField = false;
        migratedFields[originalIndex] = original;
      }

      // Remove the old "moved" entry and replace with a proper link entry
      const oldEntryIndex = migratedFields.findIndex(f =>
        f.csvColumnName === dataField.csvColumnName &&
        f.isAnnotationField &&
        !f.isDataFieldLink &&
        !f.isNewColumn
      );
      if (oldEntryIndex !== -1) {
        // Convert to a proper data field link
        migratedFields[oldEntryIndex] = {
          ...dataField,
          isDataFieldLink: true,
          sourceCsvColumnName: dataField.csvColumnName,
        };
      }
    }

    return { migrated: true, migratedFields, migrationLog: log };
  }
}
