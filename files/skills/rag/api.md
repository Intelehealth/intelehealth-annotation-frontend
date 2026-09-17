# Frontend RAG — API client

`src/lib/api/rag.ts` (`ragAPI`) + `src/lib/api/workspaces.ts` (`workspacesAPI`), backed by
`jsonApi` (JWT):

```
ragAPI:
  status(datasetId)  index(datasetId)  reindex(datasetId)
  documents(datasetId)  models()  chat({datasetId, question, model?})
  orchestrate({datasetId, question, model?})
  getConversation(datasetId)  clearConversation(datasetId)
  relatedQuestions(datasetId)  generateRelatedQuestions(datasetId, count?)
  coverage(datasetId)
  saveUserSettings({preferredModel?, preferredEmbeddingModel?})
  saveDatasetSettings(datasetId, {model?, embedModel?, systemPrompt?, temperature?, topK?})

workspacesAPI:
  list() get(id) create(data) update(id, data) remove(id)
```
Document binary/rows come from `processingAPI` (`getDocumentContent`, rows);
annotation config from `fieldSelectionAPI`.