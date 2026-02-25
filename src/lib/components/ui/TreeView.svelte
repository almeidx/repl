<script lang="ts">
	import * as treeView from "@zag-js/tree-view";
	import { useMachine } from "@zag-js/svelte";
	import { zagNormalizeProps } from "$lib/ui/zag/props";

	interface TreeNodeItem {
		id: string;
		label: string;
		disabled?: boolean;
		children?: TreeNodeItem[];
	}

	interface Props {
		id: string;
		label?: string;
		nodes: TreeNodeItem[];
		selectionmode?: "single" | "multiple";
		onselectionchange?: (value: string[]) => void;
	}

	let { id, label = "Tree", nodes, selectionmode = "single", onselectionchange }: Props = $props();

	const collection = $derived.by(() =>
		treeView.collection<TreeNodeItem>({
			rootNode: {
				id: "__root__",
				label: "root",
				children: nodes,
			},
			nodeToValue: (node) => node.id,
			nodeToString: (node) => node.label,
			nodeToChildren: (node) => node.children ?? [],
			isNodeDisabled: (node) => Boolean(node.disabled),
		}),
	);

	const service = useMachine(treeView.machine, () => ({
		id,
		collection,
		selectionMode: selectionmode,
		onSelectionChange(details) {
			onselectionchange?.(details.selectedValue);
		},
	}));

	const api = $derived.by(() => treeView.connect(service, zagNormalizeProps));
	const visibleNodes = $derived.by(() => api.getVisibleNodes().filter(({ node }) => node.id !== "__root__"));

	function getNodeLabel(node: TreeNodeItem): string {
		return node.label;
	}
</script>

<div {...api.getRootProps()} class="rounded border border-border bg-bg-secondary">
	<div {...api.getLabelProps()} class="px-3 py-2 text-xs uppercase tracking-wider text-text-secondary border-b border-border">
		{label}
	</div>
	<ul {...api.getTreeProps()} class="py-1">
		{#each visibleNodes as item (item.node.id)}
			{@const nodeProps = { node: item.node, indexPath: item.indexPath }}
			{@const nodeState = api.getNodeState(nodeProps)}
			{#if nodeState.isBranch}
				<li
					{...api.getBranchProps(nodeProps)}
					class="flex items-center gap-1 px-2 py-1"
					style={`padding-left: ${Math.max(8, nodeState.depth * 14 + 8)}px;`}
				>
					<button {...api.getBranchTriggerProps(nodeProps)} type="button" class="bg-transparent px-1 py-0 text-text-secondary">
						{nodeState.expanded ? "▾" : "▸"}
					</button>
					<span {...api.getBranchTextProps(nodeProps)} class="text-sm">{getNodeLabel(item.node)}</span>
				</li>
			{:else}
				<li
					{...api.getItemProps(nodeProps)}
					class="flex items-center gap-1 px-2 py-1"
					style={`padding-left: ${Math.max(8, nodeState.depth * 14 + 24)}px;`}
				>
					<span {...api.getItemTextProps(nodeProps)} class="text-sm">{getNodeLabel(item.node)}</span>
				</li>
			{/if}
		{/each}
	</ul>
</div>
