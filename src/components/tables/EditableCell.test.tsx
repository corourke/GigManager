import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { EditableCell } from './EditableCell'
import { ColumnDef } from './SmartDataTable'

const table = document.createElement('table')
const tbody = document.createElement('tbody')
const tr = document.createElement('tr')
table.appendChild(tbody)
tbody.appendChild(tr)

function renderCheckboxCell(value: boolean, onSave: (newValue: any) => Promise<void>) {
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

describe('EditableCell onCellClick', () => {
  function renderTitleCell(onCellClick: (row: any) => void, editable = true) {
    const column: ColumnDef<any> = {
      id: 'title',
      header: 'Title',
      accessor: 'title',
      type: 'text',
      editable,
      onCellClick,
    }

    return render(
      <EditableCell
        value="Some Title"
        column={column}
        row={{ id: '1', title: 'Some Title' }}
        onSave={vi.fn()}
        isSelected={false}
        onSelect={vi.fn()}
      />,
      { container: document.body.appendChild(tr) }
    )
  }

  it('calls onCellClick on a single click instead of selecting', () => {
    const onCellClick = vi.fn()
    const onSelect = vi.fn()
    const column: ColumnDef<any> = {
      id: 'title',
      header: 'Title',
      accessor: 'title',
      type: 'text',
      editable: true,
      onCellClick,
    }
    const { getByText } = render(
      <EditableCell
        value="Some Title"
        column={column}
        row={{ id: '1', title: 'Some Title' }}
        onSave={vi.fn()}
        isSelected={false}
        onSelect={onSelect}
      />,
      { container: document.body.appendChild(tr) }
    )

    fireEvent.click(getByText('Some Title'))

    expect(onCellClick).toHaveBeenCalledWith({ id: '1', title: 'Some Title' })
    expect(onSelect).not.toHaveBeenCalled()
  })

  // Regression (#27): onCellClick fires on every click, including the first
  // click of a double-click, so a double-click can never reach edit mode —
  // `editable` must be ignored whenever onCellClick is set.
  it('does not enter edit mode on double-click even when editable is true', () => {
    const { container, getByText } = renderTitleCell(vi.fn())

    fireEvent.doubleClick(getByText('Some Title'))

    expect(container.querySelector('input')).toBeNull()
  })
})
