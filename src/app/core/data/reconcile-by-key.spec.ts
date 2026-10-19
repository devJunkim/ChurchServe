import { reconcileByKey } from './reconcile-by-key';

interface Item {
  readonly id: string;
  readonly value: string;
}

const equalItem = (left: Item, right: Item) => left.id === right.id && left.value === right.value;

describe('reconcileByKey', () => {
  it('returns the previous array when order and values are unchanged', () => {
    const previous: readonly Item[] = [
      { id: 'one', value: '1' },
      { id: 'two', value: '2' },
    ];
    const incoming = previous.map((item) => ({ ...item }));

    const result = reconcileByKey(previous, incoming, (item) => item.id, equalItem);

    expect(result).toBe(previous);
  });

  it('preserves unchanged items when another item changes', () => {
    const previous: readonly Item[] = [
      { id: 'one', value: '1' },
      { id: 'two', value: '2' },
    ];
    const incoming: readonly Item[] = [
      { id: 'one', value: '1' },
      { id: 'two', value: 'updated' },
    ];

    const result = reconcileByKey(previous, incoming, (item) => item.id, equalItem);

    expect(result).not.toBe(previous);
    expect(result[0]).toBe(previous[0]);
    expect(result[1]).toBe(incoming[1]);
  });

  it('preserves item identity while respecting a new order', () => {
    const previous: readonly Item[] = [
      { id: 'one', value: '1' },
      { id: 'two', value: '2' },
    ];
    const incoming: readonly Item[] = [
      { id: 'two', value: '2' },
      { id: 'one', value: '1' },
    ];

    const result = reconcileByKey(previous, incoming, (item) => item.id, equalItem);

    expect(result[0]).toBe(previous[1]);
    expect(result[1]).toBe(previous[0]);
  });

  it('keeps the stable empty array when both inputs are empty', () => {
    const previous: readonly Item[] = [];

    expect(reconcileByKey(previous, [], (item) => item.id, equalItem)).toBe(previous);
  });
});
