import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnConnect,
  type OnEdgesDelete,
  type OnNodesDelete,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  type MouseEvent,
  type ReactElement,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { EventSeedDefinition } from '../types';

const NODE_W = 200;
const NODE_H = 64;

export type EventNodeData = {
  eventId: number;
  label: string;
  isBase?: boolean;
  kind: 'base' | 'branch' | 'leaf';
  seedIndex: number;
};

export interface EventsTreeFlowProps {
  seed: EventSeedDefinition;
  seedIndex: number;
  onEditEvent: (seedIndex: number, eventIndex: number) => void;
  onDeleteEvent: (seedIndex: number, eventIndex: number) => void;
  onAddEvent: (seedIndex: number) => void;
  onConnectEvents: (
    seedIndex: number,
    parentEventId: number,
    childEventId: number
  ) => void;
  onDisconnectEvents: (
    seedIndex: number,
    parentEventId: number,
    childEventId: number
  ) => void;
}

function buildEdgeMap(seed: EventSeedDefinition): Map<number, number[]> {
  const children = new Map<number, number[]>();
  const known = new Set(seed.events.map((e) => e.id));
  for (const event of seed.events) {
    for (const result of event.results ?? []) {
      for (const action of result.actions) {
        if (action.type !== 'createEvent') continue;
        const childId = Number(action.event);
        if (!known.has(childId) || childId === event.id) continue;
        const list = children.get(event.id) ?? [];
        if (!list.includes(childId)) list.push(childId);
        children.set(event.id, list);
      }
    }
  }
  return children;
}

function layoutElements(
  seed: EventSeedDefinition,
  seedIndex: number
): { nodes: Node<EventNodeData>[]; edges: Edge[] } {
  const children = buildEdgeMap(seed);
  const outbound = new Set(children.keys());

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 56,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });

  for (const event of seed.events) {
    g.setNode(String(event.id), { width: NODE_W, height: NODE_H });
  }
  for (const [parentId, kids] of children) {
    for (const childId of kids) {
      g.setEdge(String(parentId), String(childId));
    }
  }
  dagre.layout(g);

  const nodes: Node<EventNodeData>[] = seed.events.map((event) => {
    const pos = g.node(String(event.id));
    const hasOut = outbound.has(event.id);
    const kind: EventNodeData['kind'] = event.isBase
      ? 'base'
      : hasOut
        ? 'branch'
        : 'leaf';
    return {
      id: String(event.id),
      type: 'eventNode',
      position: {
        x: (pos?.x ?? 0) - NODE_W / 2,
        y: (pos?.y ?? 0) - NODE_H / 2,
      },
      data: {
        eventId: event.id,
        label: event.label,
        isBase: event.isBase,
        kind,
        seedIndex,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  const edges: Edge[] = [];
  for (const [parentId, kids] of children) {
    for (const childId of kids) {
      edges.push({
        id: `e-${parentId}-${childId}`,
        source: String(parentId),
        target: String(childId),
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#3d4a63', strokeWidth: 2, strokeDasharray: '6 4' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3d4a63',
          width: 18,
          height: 18,
        },
      });
    }
  }

  return { nodes, edges };
}

function EventFlowNode({
  data,
  selected,
}: NodeProps<Node<EventNodeData>>): ReactElement {
  return createElement(
    'div',
    {
      className: `rf-event-node rf-event-node--${data.kind}${
        selected ? ' selected' : ''
      }`,
    },
    createElement(Handle, {
      type: 'target',
      position: Position.Top,
      className: 'rf-handle',
      isConnectable: true,
    }),
    createElement(
      'div',
      { className: 'rf-event-node__title' },
      `${data.isBase ? '★ ' : ''}#${data.eventId} ${data.label}`
    ),
    createElement(Handle, {
      type: 'source',
      position: Position.Bottom,
      className: 'rf-handle',
      isConnectable: true,
    })
  );
}

const nodeTypes = { eventNode: EventFlowNode };

function EventsTreeFlowInner(props: EventsTreeFlowProps): ReactElement {
  const {
    seed,
    seedIndex,
    onEditEvent,
    onDeleteEvent,
    onAddEvent,
    onConnectEvents,
    onDisconnectEvents,
  } = props;

  const graphKey = useMemo(
    () =>
      JSON.stringify(
        seed.events.map((e) => [
          e.id,
          e.label,
          !!e.isBase,
          (e.results ?? []).flatMap((r) =>
            r.actions
              .filter((a) => a.type === 'createEvent')
              .map((a) => (a.type === 'createEvent' ? a.event : ''))
          ),
        ])
      ),
    [seed.events]
  );

  const initial = useMemo(
    () => layoutElements(seed, seedIndex),
    [seed, seedIndex, graphKey]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
  }, [initial, setNodes, setEdges]);

  const findEventIndex = useCallback(
    (eventId: number) => seed.events.findIndex((e) => e.id === eventId),
    [seed.events]
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;
      const parentId = Number(connection.source);
      const childId = Number(connection.target);
      onConnectEvents(seedIndex, parentId, childId);
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `e-${parentId}-${childId}`,
            type: 'smoothstep',
            style: {
              stroke: '#3d4a63',
              strokeWidth: 2,
              strokeDasharray: '6 4',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#3d4a63',
              width: 18,
              height: 18,
            },
          },
          eds
        )
      );
    },
    [onConnectEvents, seedIndex, setEdges]
  );

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      for (const edge of deleted) {
        onDisconnectEvents(
          seedIndex,
          Number(edge.source),
          Number(edge.target)
        );
      }
    },
    [onDisconnectEvents, seedIndex]
  );

  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      for (const node of deleted) {
        const eventId = Number(node.id);
        const eventIndex = findEventIndex(eventId);
        if (eventIndex < 0) continue;
        const event = seed.events[eventIndex];
        if (!event) continue;
        if (!confirm(`Really delete event "${event.label}"?`)) {
          continue;
        }
        onDeleteEvent(seedIndex, eventIndex);
      }
    },
    [findEventIndex, onDeleteEvent, seed.events, seedIndex]
  );

  const onNodeDoubleClick = useCallback(
    (_: MouseEvent, node: Node) => {
      const eventIndex = findEventIndex(Number(node.id));
      if (eventIndex >= 0) onEditEvent(seedIndex, eventIndex);
    },
    [findEventIndex, onEditEvent, seedIndex]
  );

  return createElement(
    'div',
    { className: 'rf-tree-shell' },
    createElement(
      'div',
      { className: 'rf-tree-toolbar' },
      createElement(
        'button',
        {
          type: 'button',
          className: 'btn small',
          onClick: () => onAddEvent(seedIndex),
        },
        'Add event'
      ),
      createElement(
        'span',
        { className: 'meta' },
        'Drag canvas to pan · scroll to zoom · drag handles to link · double-click to edit'
      )
    ),
    createElement(
      'div',
      { className: 'rf-tree-canvas' },
      createElement(ReactFlow, {
        nodes: nodes as Node[],
        edges,
        onNodesChange: onNodesChange as never,
        onEdgesChange,
        onConnect,
        onEdgesDelete,
        onNodesDelete,
        onNodeDoubleClick,
        nodeTypes,
        fitView: true,
        fitViewOptions: { padding: 0.2 },
        minZoom: 0.2,
        maxZoom: 1.75,
        nodesDraggable: true,
        nodesConnectable: true,
        elementsSelectable: true,
        panOnDrag: true,
        zoomOnScroll: true,
        selectionOnDrag: false,
        deleteKeyCode: ['Backspace', 'Delete'],
        proOptions: { hideAttribution: true },
        defaultEdgeOptions: {
          type: 'smoothstep',
          style: { stroke: '#3d4a63', strokeWidth: 2, strokeDasharray: '6 4' },
        },
        style: { width: '100%', height: '100%' },
        children: [
          createElement(Background, {
            key: 'bg',
            variant: BackgroundVariant.Dots,
            gap: 18,
            size: 1,
            color: '#c5cad6',
          }),
          createElement(Controls, {
            key: 'controls',
            showInteractive: false,
            position: 'bottom-left',
          }),
        ],
      })
    )
  );
}

export function EventsTreeFlow(props: EventsTreeFlowProps): ReactElement {
  return createElement(
    ReactFlowProvider,
    null,
    createElement(EventsTreeFlowInner, props)
  );
}

const mountedRoots = new Map<HTMLElement, Root>();

export function disposeEventsTreeFlows(): void {
  for (const root of mountedRoots.values()) {
    root.unmount();
  }
  mountedRoots.clear();
}

export function mountEventsTreeFlow(
  container: HTMLElement,
  props: EventsTreeFlowProps
): void {
  const existing = mountedRoots.get(container);
  if (existing) {
    existing.render(createElement(EventsTreeFlow, props));
    return;
  }
  const root = createRoot(container);
  mountedRoots.set(container, root);
  root.render(createElement(EventsTreeFlow, props));
}
