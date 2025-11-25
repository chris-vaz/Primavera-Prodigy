import React, { useMemo, useState, useRef, useEffect } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { buildWBSHierarchy } from "../../lib/xer-parser/utils";
import type { WBSNodeTree } from "../../lib/xer-parser/utils";
import type { P6WBSNode } from "../../lib/xer-parser/types";
import './WBSStyles2.css';

// Simple Icons
const ChevronDown = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const FolderOpen = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const Folder = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

// WBS Node Component
interface WBSNodeProps {
  node: WBSNodeTree;
  onSelect: (wbsId: string) => void;
  selectedWBSId: string | null;
  searchQuery: string;
  highlightId: string | null;
  setNodeRefs: React.Dispatch<React.SetStateAction<Record<string, HTMLDivElement>>>;
}

const WBSNode: React.FC<WBSNodeProps> = ({ node, onSelect, selectedWBSId, searchQuery, highlightId, setNodeRefs }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  const nameMatches = searchQuery
    ? node.wbs_name.toLowerCase().includes(searchQuery.toLowerCase())
    : false;
  const isSelected = selectedWBSId === node.wbs_id;
  const isHighlighted = highlightId === node.wbs_id;

  // Auto-open branch if search matches
  React.useEffect(() => {
    if (searchQuery && nameMatches) setIsOpen(true);
  }, [searchQuery, nameMatches]);

  // Save ref for scroll-to functionality
  const nodeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (nodeRef.current) setNodeRefs(prev => ({ ...prev, [node.wbs_id]: nodeRef.current! }));
  }, [nodeRef.current]);

  return (
    <div key={node.wbs_id}>
      <div
        ref={nodeRef}
        className={`wbs-node ${isSelected ? "selected" : ""} ${nameMatches ? "search-match" : ""} ${isHighlighted ? "highlight-active" : ""}`}
        style={{ paddingLeft: `${(node.level * 1.5) + 0.75}rem` }}
        onClick={() => onSelect(node.wbs_id)}
      >
        {node.children.length > 0 ? (
          <button
            className="wbs-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            <ChevronDown
              style={{
                transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                transition: "transform 0.2s"
              }}
            />
          </button>
        ) : (
          <div className="wbs-spacer"></div>
        )}

        {node.children.length > 0 ? <FolderOpen className="wbs-icon" /> : <Folder className="wbs-icon" />}

        <span className="wbs-name">
          {nameMatches ? (
            <>
              {node.wbs_name.substring(0, node.wbs_name.toLowerCase().indexOf(searchQuery.toLowerCase()))}
              <span className="highlight">{searchQuery}</span>
              {node.wbs_name.substring(
                node.wbs_name.toLowerCase().indexOf(searchQuery.toLowerCase()) + searchQuery.length
              )}
            </>
          ) : node.wbs_name}
        </span>
      </div>

      {isOpen && node.children.map(child => (
        <WBSNode
          key={child.wbs_id}
          node={child}
          onSelect={onSelect}
          selectedWBSId={selectedWBSId}
          searchQuery={searchQuery}
          highlightId={highlightId}
          setNodeRefs={setNodeRefs}
        />
      ))}
    </div>
  );
};

// Main Component
const WBSNavigation: React.FC = () => {
  const projectData = useProjectStore((state) => state.projectData);
  const selectedWBSId = useProjectStore((state) => state.selectedWBSId);
  const setSelectedWBSId = useProjectStore((state) => state.setSelectedWBSId);

  const [searchQuery, setSearchQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [nodeRefs, setNodeRefs] = useState<Record<string, HTMLDivElement>>({});

  const wbsTree = useMemo(() => {
    if (!projectData?.wbs) return [];
    return buildWBSHierarchy(projectData.wbs as P6WBSNode[]);
  }, [projectData]);

  // Flatten WBS tree for search
  const flatNodes: WBSNodeTree[] = useMemo(() => {
    const result: WBSNodeTree[] = [];
    function traverse(nodes: WBSNodeTree[]) {
      nodes.forEach(node => {
        result.push(node);
        if (node.children.length) traverse(node.children);
      });
    }
    traverse(wbsTree);
    return result;
  }, [wbsTree]);

  const matches = useMemo(() => {
    if (!searchQuery) return [];
    return flatNodes.filter(node => node.wbs_name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [flatNodes, searchQuery]);

  // Scroll to current highlighted node
  useEffect(() => {
    if (!matches.length) return;
    const id = matches[highlightIndex]?.wbs_id;
    if (!id) return;
    nodeRefs[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightIndex, matches, nodeRefs]);

  const goPrevMatch = () => {
    setHighlightIndex((prev) => (prev === 0 ? matches.length - 1 : prev - 1));
  };
  const goNextMatch = () => {
    setHighlightIndex((prev) => (prev === matches.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      {/* HEADER */}
      <div className="sidebar-header">
        <h3 className="sidebar-title">{projectData?.project.shortName}</h3>
        <p className="sidebar-subtitle">Work Breakdown Structure</p>
      </div>

      {/* SEARCH BAR + NAVIGATION */}
      <div className="wbs-search-container">
        <input
          className="wbs-search-input"
          type="text"
          placeholder="Search WBS or Activities…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setHighlightIndex(0); // reset highlight
          }}
        />
        {matches.length > 0 && (
          <div className="wbs-search-nav">
            <button onClick={goPrevMatch}>&#9650;</button>
            <span>{highlightIndex + 1}/{matches.length}</span>
            <button onClick={goNextMatch}>&#9660;</button>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="sidebar-content">
        <div
          className={`wbs-show-all ${selectedWBSId === null ? "selected" : ""}`}
          onClick={() => setSelectedWBSId(null)}
        >
          <FolderOpen className="wbs-icon" />
          <span style={{ fontWeight: "bold" }}>Show All Activities</span>
        </div>

        {wbsTree.map((node) => (
          <WBSNode
            key={node.wbs_id}
            node={node}
            onSelect={setSelectedWBSId}
            selectedWBSId={selectedWBSId}
            searchQuery={searchQuery}
            highlightId={matches[highlightIndex]?.wbs_id || null}
            setNodeRefs={setNodeRefs}
          />
        ))}
      </div>
    </>
  );
};

export default WBSNavigation;
