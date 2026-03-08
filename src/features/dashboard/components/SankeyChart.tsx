import { useRef, useState, useEffect, useMemo } from 'react';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import type { SankeyNode } from 'd3-sankey';
import { Button } from '@/shared/ui/button';
import { Transaction, CategoryItem } from '@/features/finance/hooks/useFinanceData';
import { formatCurrencyCompact } from '@/core/utils';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { excludeTransfers } from '@/features/finance/utils/cashflowUtils';
import { DEFAULT_CURRENCY_CODE } from '@/features/finance/constants/currencyConstants';

interface SankeyChartProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  drillDown?: { type: 'income' | 'expense', page: number } | null;
  onDrillDownChange?: (drill: { type: 'income' | 'expense', page: number } | null) => void;
}

interface CustomNode {
  id: string;
  name: string;
  categoryType: 'income' | 'expense' | 'root';
  color?: string;
}

interface CustomLink {
  source: string | number | CustomNode;
  target: string | number | CustomNode;
  value: number;
}

export const SankeyChart: React.FC<SankeyChartProps> = ({ transactions, categories, drillDown, onDrillDownChange }) => {
  const { currency } = useFormatCurrency();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  // Handle Resize
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) {
        return;
      }
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Process data for Sankey
  const { nodes, links, rawTotalIncome, rawTotalExpense } = useMemo(() => {
    const baseTxs = excludeTransfers(transactions).filter(tx => !(tx.type === 'expense' && (tx.installments || 1) > 1));
    const incomeTxs = baseTxs.filter(tx => tx.type === 'income');
    const expenseTxs = baseTxs.filter(tx => tx.type === 'expense' || tx.type === 'loan');

    if (incomeTxs.length === 0 && expenseTxs.length === 0) {
      return { nodes: [], links: [], rawTotalIncome: 0, rawTotalExpense: 0 };
    }

    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();

    let totalIncome = 0;
    let totalExpense = 0;

    incomeTxs.forEach(tx => {
      if (!tx.category_id) {
        return;
      }
      const val = incomeMap.get(tx.category_id) || 0;
      incomeMap.set(tx.category_id, val + tx.amount);
      totalIncome += tx.amount;
    });

    expenseTxs.forEach(tx => {
      if (!tx.category_id) {
        return;
      }
      const val = expenseMap.get(tx.category_id) || 0;
      expenseMap.set(tx.category_id, val + tx.amount);
      totalExpense += tx.amount;
    });

    const categoryDict = new Map(categories.map(c => [c.id, c]));

    // Save raw totals BEFORE balancing
    const rawTotalIncomeSave = totalIncome;
    const rawTotalExpenseSave = totalExpense;

    if (totalExpense > totalIncome) {
      incomeMap.set('in_previous', totalExpense - totalIncome);
      totalIncome = totalExpense;
    } else if (totalIncome > totalExpense) {
      expenseMap.set('out_remaining', totalIncome - totalExpense);
      totalExpense = totalIncome;
    }

    const totalActualIncome = Array.from(incomeMap.entries()).reduce((sum, [_, v]) => sum + v, 0);
    const totalActualExpense = Array.from(expenseMap.entries()).reduce((sum, [_, v]) => sum + v, 0);

    const getPercentage = (amount: number, type: 'income' | 'expense') => {
      const base = type === 'income' ? totalActualIncome : totalActualExpense;
      if (!base) {
        return '0.0';
      }
      return ((amount / base) * 100).toFixed(1);
    };

    const processMap = (map: Map<string, number>, isIncome: boolean, page: number) => {
      let items = Array.from(map.entries()).map(([id, amount]) => ({ id, amount }));
      const specialId = isIncome ? 'in_previous' : 'out_remaining';
      const specialItem = items.find(i => i.id === specialId);
      items = items.filter(i => i.id !== specialId);

      items.sort((a, b) => b.amount - a.amount);

      const startIndex = page * 9;
      let slicedItems = items.slice(startIndex);

      if (slicedItems.length > 9) {
        const top9 = slicedItems.slice(0, 9);
        const extras = slicedItems.slice(9);
        const othersAmount = extras.reduce((sum, item) => sum + item.amount, 0);
        top9.push({ id: isIncome ? 'in_other' : 'out_other', amount: othersAmount });
        slicedItems = top9;
      }

      if (page === 0 && specialItem) {
        slicedItems.push(specialItem);
      }

      return slicedItems;
    };

    const nodeArray: CustomNode[] = [];
    const linkArray: CustomLink[] = [];

    if (drillDown) {
      if (drillDown.type === 'income') {
        const incomesData = processMap(incomeMap, true, drillDown.page);
        const rootName = "Otros Ingresos";
        nodeArray.push({ id: rootName, name: rootName, categoryType: 'root', color: "hsl(var(--muted-foreground))" });
        incomesData.forEach(({ id, amount }) => {
          let name = "Otros";
          let color = "hsl(var(--success))";
          let label = "";
          if (id === 'in_other') {
            name = "Otros Ingresos";
            color = "hsl(var(--muted-foreground))";
            label = `${name} (${getPercentage(amount, 'income')}%)`;
          } else {
            const cat = categoryDict.get(id);
            if (cat) {
              name = cat.name;
              color = cat.color || color;
            }
            label = `${name} (${getPercentage(amount, 'income')}%)`;
          }
          const nodeId = `in_${id}`;
          nodeArray.push({ id: nodeId, name: label || name, categoryType: 'income', color });
          linkArray.push({ source: nodeId, target: rootName, value: amount });
        });
      } else {
        const expensesData = processMap(expenseMap, false, drillDown.page);
        const rootName = "Otros Gastos";
        nodeArray.push({ id: rootName, name: rootName, categoryType: 'root', color: "hsl(var(--muted-foreground))" });
        expensesData.forEach(({ id, amount }) => {
          let name = "Otros";
          let color = "hsl(var(--destructive))";
          let label = "";
          if (id === 'out_other') {
            name = "Otros Gastos";
            color = "hsl(var(--muted-foreground))";
            label = `${name} (${getPercentage(amount, 'expense')}%)`;
          } else {
            const cat = categoryDict.get(id);
            if (cat) {
              name = cat.name;
              color = cat.color || color;
            }
            label = `${name} (${getPercentage(amount, 'expense')}%)`;
          }
          const nodeId = `out_${id}`;
          nodeArray.push({ id: nodeId, name: label || name, categoryType: 'expense', color });
          linkArray.push({ source: rootName, target: nodeId, value: amount });
        });
      }
      return { nodes: nodeArray, links: linkArray };
    }

    const finalIncomes = processMap(incomeMap, true, 0);
    const finalExpenses = processMap(expenseMap, false, 0);

    // Root Node
    const rootName = "";
    nodeArray.push({ id: rootName, name: rootName, categoryType: 'root', color: "hsl(var(--muted-foreground))" });

    finalIncomes.forEach(({ id, amount }) => {
      let name = "Otros Ingresos";
      let color = "hsl(var(--success))";
      let label = "";
      if (id === 'in_previous') {
        name = "Ingresos Anteriores";
        color = "hsl(var(--muted-foreground))";
        label = `${name} (${getPercentage(amount, 'income')}%)`;
      } else if (id === 'in_other') {
        name = "Otros Ingresos";
        color = "hsl(var(--muted-foreground))";
        label = `${name} (${getPercentage(amount, 'income')}%)`;
      } else {
        const cat = categoryDict.get(id);
        if (cat) {
          name = cat.name;
          color = cat.color || color;
        }
        label = `${name} (${getPercentage(amount, 'income')}%)`;
      }

      const nodeId = id.startsWith('in_') ? id : `in_${id}`;
      nodeArray.push({ id: nodeId, name: label || name, categoryType: 'income', color });
      linkArray.push({ source: nodeId, target: rootName, value: amount });
    });

    finalExpenses.forEach(({ id, amount }) => {
      let name = "Otros Gastos";
      let color = "hsl(var(--destructive))";
      let label = "";
      if (id === 'out_remaining') {
        name = "Restante / Ahorro";
        color = "hsl(var(--muted-foreground))";
        label = name;
      } else if (id === 'out_other') {
        name = "Otros Gastos";
        color = "hsl(var(--muted-foreground))";
        label = `${name} (${getPercentage(amount, 'expense')}%)`;
      } else {
        const cat = categoryDict.get(id);
        if (cat) {
          name = cat.name;
          color = cat.color || color;
        }
        label = `${name} (${getPercentage(amount, 'expense')}%)`;
      }

      const nodeId = id.startsWith('out_') ? id : `out_${id}`;
      nodeArray.push({ id: nodeId, name: label || name, categoryType: 'expense', color });
      linkArray.push({ source: rootName, target: nodeId, value: amount });
    });

    // Calculate total layout
    return { nodes: nodeArray, links: linkArray, rawTotalIncome: rawTotalIncomeSave, rawTotalExpense: rawTotalExpenseSave };
  }, [transactions, categories, drillDown]);


  const graph = useMemo(() => {
    if (nodes.length === 0 || dimensions.width === 0) {
      return null;
    }

    const sankeyGenerator = sankey<CustomNode, CustomLink>()
      .nodeId(d => d.id)
      .nodeWidth(15)
      .nodePadding(18)
      .extent([[10, drillDown ? 60 : 10], [dimensions.width - 10, dimensions.height - 50]])
      .nodeSort((a, b) => {
        // Only true catch-all/aggregate nodes go to the bottom
        const aId = a.id;
        const bId = b.id;
        const aIsSpecial = aId === 'out_other' || aId === 'in_other' || aId === 'out_remaining' || (drillDown && aId.startsWith('out_') && a.name.startsWith('Otros Gastos')) || (drillDown && aId.startsWith('in_') && a.name.startsWith('Otros Ingresos'));
        const bIsSpecial = bId === 'out_other' || bId === 'in_other' || bId === 'out_remaining' || (drillDown && bId.startsWith('out_') && b.name.startsWith('Otros Gastos')) || (drillDown && bId.startsWith('in_') && b.name.startsWith('Otros Ingresos'));
        if (aIsSpecial && !bIsSpecial) {
          return 1;
        }
        if (!aIsSpecial && bIsSpecial) {
          return -1;
        }
        if (aId === 'out_remaining' && bId === 'out_other') {
          return 1;
        }
        if (bId === 'out_remaining' && aId === 'out_other') {
          return -1;
        }

        // All income and expense nodes (including in_previous) sort by value descending
        return (b.value || 0) - (a.value || 0);
      })
      .linkSort((a, b) => {
        const aSourceId = typeof a.source === 'object' ? a.source.id : a.source;
        const bSourceId = typeof b.source === 'object' ? b.source.id : b.source;
        const aTargetId = typeof a.target === 'object' ? a.target.id : a.target;
        const bTargetId = typeof b.target === 'object' ? b.target.id : b.target;

        const aTargetName = typeof a.target === 'object' ? a.target.name : '';
        const bTargetName = typeof b.target === 'object' ? b.target.name : '';
        const aSourceName = typeof a.source === 'object' ? a.source.name : '';
        const bSourceName = typeof b.source === 'object' ? b.source.name : '';

        // Catch-all/aggregate links always go to the bottom
        const aIsSpecial = aTargetId === 'out_other' || aTargetId === 'out_remaining' || aSourceId === 'in_other' || (drillDown && aTargetId === 'out_other' && aTargetName.startsWith('Otros Gastos')) || (drillDown && aSourceId === 'in_other' && aSourceName.startsWith('Otros Ingresos'));
        const bIsSpecial = bTargetId === 'out_other' || bTargetId === 'out_remaining' || bSourceId === 'in_other' || (drillDown && bTargetId === 'out_other' && bTargetName.startsWith('Otros Gastos')) || (drillDown && bSourceId === 'in_other' && bSourceName.startsWith('Otros Ingresos'));
        if (aIsSpecial && !bIsSpecial) {
          return 1;
        }
        if (!aIsSpecial && bIsSpecial) {
          return -1;
        }
        if (aTargetId === 'out_remaining' && bTargetId === 'out_other') {
          return 1;
        }
        if (bTargetId === 'out_remaining' && aTargetId === 'out_other') {
          return -1;
        }

        // All links (including from in_previous) sort by value descending
        return (b.value || 0) - (a.value || 0);
      });

    try {
      const result = sankeyGenerator({
        nodes: nodes.map(d => ({ ...d })),
        links: links.map(d => ({ ...d }))
      });

      // ── Vertical centering post-process ──────────────────────────────────
      // d3-sankey starts nodes from the top of the extent. With few nodes,
      // content clusters at the top instead of centering. We shift all
      // node and link y positions so the content block is vertically centered.
      const visibleNodes = result.nodes.filter(n => n.id !== '');
      if (visibleNodes.length > 0) {
        const minY = Math.min(...visibleNodes.map(n => n.y0 ?? 0));
        const maxY = Math.max(...visibleNodes.map(n => n.y1 ?? 0));
        const contentHeight = maxY - minY;
        const availableTop = 10;
        const availableBottom = dimensions.height - 50;
        const available = availableBottom - availableTop;
        // Shift to center; never move above the top padding
        const offset = Math.max(0, (available - contentHeight) / 2) - minY + availableTop;
        if (Math.abs(offset) > 0.5) {
          result.nodes.forEach(n => {
            if (n.y0 !== undefined) {
              n.y0 += offset;
            }
            if (n.y1 !== undefined) {
              n.y1 += offset;
            }
          });
          result.links.forEach(l => {
            if (typeof l.y0 === 'number') {
              (l as unknown as Record<string, unknown>).y0 = (l.y0 as number) + offset;
            }
            if (typeof l.y1 === 'number') {
              (l as unknown as Record<string, unknown>).y1 = (l.y1 as number) + offset;
            }
          });
        }
      }

      return result;
    } catch (e) {
      console.error("Error generating sankey layout", e);
      return null;
    }
  }, [nodes, links, dimensions, drillDown]);


  if (!graph || nodes.length === 0) {
    return (
      <div ref={containerRef} className="w-full h-[400px] relative overflow-hidden flex items-center justify-center">
        <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-gray-50/50 p-6 text-center dark:bg-muted/20 md:p-8">
          <p className="max-w-md text-sm text-muted-foreground">No hay suficientes datos de flujo para este período.</p>
        </div>
      </div>
    );
  }

  const cur = currency || DEFAULT_CURRENCY_CODE;

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] relative overflow-hidden">
      {drillDown && (
        <div className="absolute top-0 left-0 z-10 pt-2 pl-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onDrillDownChange?.(null)} className="shadow-sm border-muted text-foreground">
            Ir a Vista General
          </Button>
          {drillDown.page > 1 && (
            <Button variant="ghost" size="sm" onClick={() => onDrillDownChange?.({ ...drillDown, page: drillDown.page - 1 })}>
              Página Anterior
            </Button>
          )}
        </div>
      )}
      {/* Total income / expense — bottom left/right */}
      {!drillDown && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-between items-end px-4 pb-1 pointer-events-none">
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-medium text-muted-foreground leading-none uppercase tracking-wide">Total Ingresos</span>
            <span className="text-sm font-bold leading-tight" style={{ color: 'hsl(var(--success))' }}>
              {formatCurrencyCompact(rawTotalIncome, cur)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-medium text-muted-foreground leading-none uppercase tracking-wide">Total Gastos</span>
            <span className="text-sm font-bold leading-tight" style={{ color: 'hsl(var(--destructive))' }}>
              {formatCurrencyCompact(rawTotalExpense, cur)}
            </span>
          </div>
        </div>
      )}
      <svg width={dimensions.width} height={dimensions.height} className="overflow-visible">
        <defs>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
            <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="linkIncome" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <g>
          {graph.links.map((link, i) => {
            const path = sankeyLinkHorizontal<CustomNode, CustomLink>()(link);
            const sourceNode = link.source as SankeyNode<CustomNode, CustomLink>;
            const targetNode = link.target as SankeyNode<CustomNode, CustomLink>;
            const isIncomeToRoot = sourceNode.categoryType === 'income';
            const linkSourceId = sourceNode.id;
            const linkTargetId = targetNode.id;
            const isOtherLink = linkSourceId === 'in_other' || linkTargetId === 'out_other';

            return (
              <path
                key={`link-${i}`}
                d={path || undefined}
                fill="none"
                stroke={isIncomeToRoot ? "url(#linkIncome)" : "url(#linkGradient)"}
                strokeWidth={Math.max(1, link.width || 0)}
                className={`transition-all ${isOtherLink ? 'cursor-pointer opacity-80 hover:opacity-100 hover:brightness-125 stroke-primary/50' : 'opacity-60 hover:opacity-90'}`}
                onClick={() => {
                  if (linkSourceId === 'in_other') {
                    onDrillDownChange?.(drillDown ? { ...drillDown, page: drillDown.page + 1 } : { type: 'income', page: 1 });
                  }
                  if (linkTargetId === 'out_other') {
                    onDrillDownChange?.(drillDown ? { ...drillDown, page: drillDown.page + 1 } : { type: 'expense', page: 1 });
                  }
                }}
              >
                <title>{`${typeof link.source === 'object' ? link.source.name : ''} → ${typeof link.target === 'object' ? link.target.name : ''}\n${formatCurrencyCompact(link.value, currency || 'COP')}`}</title>
              </path>
            );
          })}
        </g>
        <g>
          {graph.nodes.map((node, i) => {
            const isOtherNode = node.id === 'in_other' || node.id === 'out_other';
            return (
              <g
                key={`node-${i}`}
                className={`transition-all ${isOtherNode ? 'cursor-pointer hover:brightness-125' : 'hover:brightness-110'}`}
                onClick={() => {
                  if (node.id === 'in_other') {
                    onDrillDownChange?.(drillDown ? { ...drillDown, page: drillDown.page + 1 } : { type: 'income', page: 1 });
                  }
                  if (node.id === 'out_other') {
                    onDrillDownChange?.(drillDown ? { ...drillDown, page: drillDown.page + 1 } : { type: 'expense', page: 1 });
                  }
                }}
              >
                {node.id !== '' && (
                  <>
                    <rect
                      x={node.x0}
                      y={node.y0}
                      width={(node.x1 || 0) - (node.x0 || 0)}
                      height={Math.max(1, (node.y1 || 0) - (node.y0 || 0))}
                      fill={node.color}
                      rx={4}
                      stroke="hsl(var(--background))"
                      strokeWidth={1}
                    >
                      <title>{`${node.name}\n${formatCurrencyCompact(node.value || 0, currency || 'COP')}`}</title>
                    </rect>
                    <text
                      x={(node.x0 || 0) < dimensions.width / 2 ? (node.x1 || 0) + 8 : (node.x0 || 0) - 8}
                      y={(node.y0 || 0) + ((node.y1 || 0) - (node.y0 || 0)) / 2}
                      dy="0.35em"
                      textAnchor={((node.x0 || 0) < dimensions.width / 2) ? "start" : "end"}
                      fontSize={12}
                      fontWeight={500}
                      fill="hsl(var(--foreground))"
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.name}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
