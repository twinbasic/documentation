export const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    package:        { type: 'string' },
    symbol:         { type: ['string', 'null'] },
    kind: {
      enum: ['gotcha', 'workaround', 'example', 'clarification', 'deprecation'],
    },
    summary:        { type: 'string' },
    detail:         { type: 'string' },
    confidence:     { enum: ['high', 'medium', 'low'] },
    source_thread:  { type: 'string' },
    date_earliest:  { type: 'string' },
    date_latest:    { type: 'string' },
  },
  required: ['package', 'kind', 'summary', 'confidence', 'source_thread',
             'date_earliest', 'date_latest'],
}

export const DOC_ADDITION_SCHEMA = {
  type: 'object',
  properties: {
    target_page:    { type: 'string' },
    section:        { type: 'string' },
    draft:          { type: 'string' },
    finding_ids:    { type: 'array', items: { type: 'string' } },
    confidence:     { enum: ['high', 'medium', 'low'] },
    date_earliest:  { type: 'string' },
    date_latest:    { type: 'string' },
    reviewer_note:  { type: ['string', 'null'] },
  },
  required: ['target_page', 'section', 'draft', 'finding_ids',
             'date_earliest', 'date_latest'],
}
