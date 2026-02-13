import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { EditableCell } from './EditableCell'
import { ColumnDef } from './SmartDataTable'

const table = document.createElement('table')
const tbody = document.createElement('tbody')
const tr = document.createElement('tr')
table.appendChild(tbody)
tbody.appendChild(tr)

function renderCheckboxCell(value: boolean, onSave: ReturnType<typeof vi.fn>) {
  const column: ColumnDef<any> = {
    id: 'active',
    header: 'Active',
    accessor: 'active',
    type: 'checkbox',
    editable: true,
  }

  return render(
    <EditableCell
      value={value}
      column={column}
      row={{ id: '1', active: value }}
      onSave={onSave}
      isSelected={true}
      onSelect={vi.fn()}
    />,
    { container: document.body.appendChild(tr) }
  )
}

describe('EditableCell checkbox SPACE toggle', () => {
  it('should toggle on consecutive SPACE presses when value prop updates', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)

    const { rerender } = renderCheckboxCell(true, onSave)

    await act(async () => {
      fireEvent.keyDown(window, { key: ' ' })
    })
    expect(onSave).toHaveBeenCalledWith(false)

    const column: ColumnDef<any> = {
      id: 'active',
      header: 'Active',
      accessor: 'active',
      type: 'checkbox',
      editable: true,
    }

    rerender(
      <EditableCell
        value={false}
        column={column}
        row={{ id: '1', active: false }}
        onSave={onSave}
        isSelected={true}
        onSelect={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.keyDown(window, { key: ' ' })
    })
    expect(onSave).toHaveBeenCalledTimes(2)
    expect(onSave).toHaveBeenLastCalledWith(true)
  })
})
