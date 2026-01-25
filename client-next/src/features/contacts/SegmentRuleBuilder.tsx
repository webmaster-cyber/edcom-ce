import { useCallback } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import type { SegmentRule, SegmentGroup } from '../../types/contact'
import { OPERATORS, ENGAGEMENT_TYPES } from '../../types/contact'

interface SegmentRuleBuilderProps {
  group: SegmentGroup
  onChange: (group: SegmentGroup) => void
  fields: string[]
  lists: { id: string; name: string }[]
  broadcasts: { id: string; name: string }[]
  tags: string[]
  depth?: number
  maxDepth?: number
}

export function SegmentRuleBuilder({
  group,
  onChange,
  fields,
  lists,
  broadcasts,
  tags,
  depth = 0,
  maxDepth = 2,
}: SegmentRuleBuilderProps) {
  const updateLogic = useCallback(
    (logic: 'and' | 'or' | 'nor') => {
      onChange({ ...group, logic })
    },
    [group, onChange]
  )

  const addRule = useCallback(() => {
    const newRule: SegmentRule = {
      type: 'info',
      field: 'email',
      operator: 'contains',
      value: '',
    }
    onChange({ ...group, rules: [...group.rules, newRule] })
  }, [group, onChange])

  const addGroup = useCallback(() => {
    const newGroup: SegmentGroup = {
      logic: 'and',
      rules: [],
    }
    onChange({ ...group, rules: [...group.rules, newGroup] })
  }, [group, onChange])

  const removeItem = useCallback(
    (index: number) => {
      const newRules = [...group.rules]
      newRules.splice(index, 1)
      onChange({ ...group, rules: newRules })
    },
    [group, onChange]
  )

  const updateItem = useCallback(
    (index: number, item: SegmentRule | SegmentGroup) => {
      const newRules = [...group.rules]
      newRules[index] = item
      onChange({ ...group, rules: newRules })
    },
    [group, onChange]
  )

  const isGroup = (item: SegmentRule | SegmentGroup): item is SegmentGroup => {
    return 'logic' in item && 'rules' in item
  }

  return (
    <div
      className={`rounded-lg border ${
        depth === 0 ? 'border-border' : 'border-primary/30 bg-primary/5'
      }`}
    >
      {/* Logic selector */}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
        <span className="text-sm text-text-secondary">Match</span>
        <select
          value={group.logic}
          onChange={(e) => updateLogic(e.target.value as 'and' | 'or' | 'nor')}
          className="input py-1 text-sm"
        >
          <option value="and">ALL of the following (AND)</option>
          <option value="or">ANY of the following (OR)</option>
          <option value="nor">NONE of the following (NOR)</option>
        </select>
      </div>

      {/* Rules */}
      <div className="divide-y divide-border/50">
        {group.rules.map((item, index) => (
          <div key={index} className="flex items-start gap-2 px-4 py-3">
            <div className="flex-shrink-0 pt-2">
              <GripVertical className="h-4 w-4 text-text-muted" />
            </div>

            <div className="flex-1 min-w-0">
              {isGroup(item) ? (
                <SegmentRuleBuilder
                  group={item}
                  onChange={(g) => updateItem(index, g)}
                  fields={fields}
                  lists={lists}
                  broadcasts={broadcasts}
                  tags={tags}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              ) : (
                <RuleEditor
                  rule={item}
                  onChange={(r) => updateItem(index, r)}
                  fields={fields}
                  lists={lists}
                  broadcasts={broadcasts}
                  tags={tags}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => removeItem(index)}
              className="flex-shrink-0 rounded-md p-1.5 text-text-muted hover:bg-red-50 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {group.rules.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-text-muted">
            No rules yet. Add a rule or group to define segment criteria.
          </div>
        )}
      </div>

      {/* Add buttons */}
      <div className="flex items-center gap-2 border-t border-border/50 px-4 py-2">
        <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addRule}>
          Add Rule
        </Button>
        {depth < maxDepth && (
          <Button variant="ghost" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addGroup}>
            Add Group
          </Button>
        )}
      </div>
    </div>
  )
}

// Individual rule editor
interface RuleEditorProps {
  rule: SegmentRule
  onChange: (rule: SegmentRule) => void
  fields: string[]
  lists: { id: string; name: string }[]
  broadcasts: { id: string; name: string }[]
  tags: string[]
}

function RuleEditor({ rule, onChange, fields, lists, broadcasts, tags }: RuleEditorProps) {
  const updateRule = (updates: Partial<SegmentRule>) => {
    onChange({ ...rule, ...updates })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Rule type */}
      <select
        value={rule.type}
        onChange={(e) => {
          const type = e.target.value as 'info' | 'lists' | 'responses'
          if (type === 'info') {
            updateRule({ type, field: 'email', operator: 'contains', value: '' })
          } else if (type === 'lists') {
            updateRule({ type, listid: lists[0]?.id || '', listop: 'in' })
          } else {
            updateRule({ type, engagetype: 'opened', engageop: 'any' })
          }
        }}
        className="input py-1.5 text-sm"
      >
        <option value="info">Contact Property</option>
        <option value="lists">List Membership</option>
        <option value="responses">Message Engagement</option>
      </select>

      {rule.type === 'info' && (
        <InfoRuleFields rule={rule} onChange={updateRule} fields={fields} tags={tags} />
      )}

      {rule.type === 'lists' && (
        <ListRuleFields rule={rule} onChange={updateRule} lists={lists} />
      )}

      {rule.type === 'responses' && (
        <ResponseRuleFields rule={rule} onChange={updateRule} broadcasts={broadcasts} />
      )}
    </div>
  )
}

// Info rule fields (property/tag tests)
function InfoRuleFields({
  rule,
  onChange,
  fields,
  tags,
}: {
  rule: SegmentRule
  onChange: (updates: Partial<SegmentRule>) => void
  fields: string[]
  tags: string[]
}) {
  const isTag = rule.field === '__tag__'
  const operators = isTag ? OPERATORS.tag : OPERATORS.text

  return (
    <>
      <select
        value={rule.field || 'email'}
        onChange={(e) => {
          const field = e.target.value
          if (field === '__tag__') {
            onChange({ field, operator: 'has', value: tags[0] || '' })
          } else {
            onChange({ field, operator: 'contains', value: '' })
          }
        }}
        className="input py-1.5 text-sm"
      >
        <optgroup label="Standard">
          <option value="email">Email</option>
          <option value="firstname">First Name</option>
          <option value="lastname">Last Name</option>
          <option value="name">Full Name</option>
          <option value="__tag__">Tag</option>
        </optgroup>
        {fields.length > 0 && (
          <optgroup label="Custom">
            {fields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <select
        value={rule.operator || 'contains'}
        onChange={(e) => onChange({ operator: e.target.value })}
        className="input py-1.5 text-sm"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {!['set', 'notset'].includes(rule.operator || '') && (
        <>
          {isTag ? (
            <select
              value={rule.value || ''}
              onChange={(e) => onChange({ value: e.target.value })}
              className="input py-1.5 text-sm min-w-[150px]"
            >
              <option value="">Select tag...</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={rule.value || ''}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="Value..."
              className="input py-1.5 text-sm min-w-[150px]"
            />
          )}
        </>
      )}
    </>
  )
}

// List membership rule fields
function ListRuleFields({
  rule,
  onChange,
  lists,
}: {
  rule: SegmentRule
  onChange: (updates: Partial<SegmentRule>) => void
  lists: { id: string; name: string }[]
}) {
  return (
    <>
      <select
        value={rule.listop || 'in'}
        onChange={(e) => onChange({ listop: e.target.value as 'in' | 'notin' })}
        className="input py-1.5 text-sm"
      >
        <option value="in">is in</option>
        <option value="notin">is not in</option>
      </select>

      <select
        value={rule.listid || ''}
        onChange={(e) => onChange({ listid: e.target.value })}
        className="input py-1.5 text-sm min-w-[200px]"
      >
        <option value="">Select list...</option>
        {lists.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </>
  )
}

// Response/engagement rule fields
function ResponseRuleFields({
  rule,
  onChange,
  broadcasts,
}: {
  rule: SegmentRule
  onChange: (updates: Partial<SegmentRule>) => void
  broadcasts: { id: string; name: string }[]
}) {
  const showCount = rule.engageop === 'count'
  const showPeriod = rule.engageop !== 'any' && rule.engageop !== 'none'

  return (
    <>
      <select
        value={rule.engagetype || 'opened'}
        onChange={(e) => onChange({ engagetype: e.target.value as SegmentRule['engagetype'] })}
        className="input py-1.5 text-sm"
      >
        {ENGAGEMENT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <select
        value={rule.engageop || 'any'}
        onChange={(e) => onChange({ engageop: e.target.value as SegmentRule['engageop'] })}
        className="input py-1.5 text-sm"
      >
        <option value="any">any message</option>
        <option value="none">no messages</option>
        <option value="count">at least N times</option>
      </select>

      {showCount && (
        <input
          type="number"
          min={1}
          value={rule.engagecount || 1}
          onChange={(e) => onChange({ engagecount: parseInt(e.target.value) || 1 })}
          className="input py-1.5 text-sm w-20"
        />
      )}

      {showPeriod && (
        <>
          <span className="text-sm text-text-secondary">in the last</span>
          <input
            type="number"
            min={1}
            value={rule.engageperiod || 30}
            onChange={(e) => onChange({ engageperiod: parseInt(e.target.value) || 30 })}
            className="input py-1.5 text-sm w-20"
          />
          <select
            value={rule.engageunit || 'days'}
            onChange={(e) => onChange({ engageunit: e.target.value as 'days' | 'hours' })}
            className="input py-1.5 text-sm"
          >
            <option value="days">days</option>
            <option value="hours">hours</option>
          </select>
        </>
      )}

      <select
        value={rule.broadcastid || ''}
        onChange={(e) => onChange({ broadcastid: e.target.value })}
        className="input py-1.5 text-sm min-w-[200px]"
      >
        <option value="">Any broadcast</option>
        {broadcasts.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </>
  )
}
