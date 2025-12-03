import React, { useState, useEffect, useRef } from 'react';
import { TranscriptSegment, Note } from '../types';
import { Button } from './Button';

interface TranscriptViewProps {
  transcript: TranscriptSegment[];
  notes: Note[];
  onAddHighlight: (
    segmentIndex: number, 
    content: string, 
    quote: string,
    highlightStart: number,
    highlightEnd: number,
    color: string
  ) => void;
  onDeleteNote: (id: string) => void;
}

const HIGHLIGHT_COLORS = [
  { hex: '#FDE047', label: 'Yellow' }, // Yellow-300
  { hex: '#86EFAC', label: 'Green' },  // Green-300
  { hex: '#93C5FD', label: 'Blue' },   // Blue-300
  { hex: '#F9A8D4', label: 'Pink' },   // Pink-300
  { hex: '#FCA5A5', label: 'Red' },    // Red-300
];

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  transcript,
  notes,
  onAddHighlight,
  onDeleteNote
}) => {
  const [selection, setSelection] = useState<{
    rect: DOMRect;
    segmentIndex: number;
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);

  const [noteContent, setNoteContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].hex);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle outside clicks to close the popover
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (selection && !(e.target as HTMLElement).closest('.note-popover')) {
        setSelection(null);
        window.getSelection()?.removeAllRanges();
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [selection]);

  // Helper to find offset relative to the segment container's text content
  const getRelativeOffset = (container: HTMLElement, targetNode: Node, targetOffset: number) => {
    let offset = 0;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode === targetNode) {
        return offset + targetOffset;
      }
      offset += (currentNode.textContent?.length || 0);
      currentNode = walker.nextNode();
    }
    return offset;
  };

  const handleMouseUp = () => {
    const winSelection = window.getSelection();
    if (!winSelection || winSelection.isCollapsed) return;

    // Traverse up to find the segment container div with data-index
    let node = winSelection.anchorNode;
    let segmentNode: HTMLElement | null = null;
    
    // Find segment container
    let curr = node;
    while (curr && curr !== containerRef.current) {
      if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).hasAttribute('data-index')) {
        segmentNode = curr as HTMLElement;
        break;
      }
      curr = curr.parentNode;
    }

    if (segmentNode) {
      const index = Number(segmentNode.getAttribute('data-index'));
      
      // Ensure focus node is in the same segment
      let focusNode = winSelection.focusNode;
      let focusSegmentNode: HTMLElement | null = null;
      let fCurr = focusNode;
      while (fCurr && fCurr !== containerRef.current) {
        if (fCurr.nodeType === Node.ELEMENT_NODE && (fCurr as HTMLElement).hasAttribute('data-index')) {
          focusSegmentNode = fCurr as HTMLElement;
          break;
        }
        fCurr = fCurr.parentNode;
      }

      if (segmentNode === focusSegmentNode && !isNaN(index)) {
        // Calculate offsets relative to the full text of the segment
        const anchorOffset = getRelativeOffset(segmentNode, winSelection.anchorNode!, winSelection.anchorOffset);
        const focusOffset = getRelativeOffset(segmentNode, winSelection.focusNode!, winSelection.focusOffset);

        const start = Math.min(anchorOffset, focusOffset);
        const end = Math.max(anchorOffset, focusOffset);
        const text = winSelection.toString();

        if (text.length > 0) {
          const range = winSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          setSelection({
            rect,
            segmentIndex: index,
            text,
            startOffset: start,
            endOffset: end
          });
          setNoteContent('');
          setSelectedColor(HIGHLIGHT_COLORS[0].hex);
        }
      }
    }
  };

  const saveHighlight = () => {
    if (selection && noteContent.trim()) {
      onAddHighlight(
        selection.segmentIndex, 
        noteContent, 
        selection.text, 
        selection.startOffset, 
        selection.endOffset,
        selectedColor
      );
      setSelection(null);
      setNoteContent('');
      window.getSelection()?.removeAllRanges();
    }
  };

  // Render a segment by slicing text based on highlights
  const renderSegment = (segment: TranscriptSegment, index: number) => {
    const segmentNotes = notes.filter(n => n.transcriptSegmentIndex === index);
    const text = segment.text;
    
    if (segmentNotes.length === 0) {
      return <span>{text}</span>;
    }

    // Create a set of boundaries
    const points = new Set<number>([0, text.length]);
    segmentNotes.forEach(n => {
      if (n.highlightStart !== undefined) points.add(Math.max(0, Math.min(n.highlightStart, text.length)));
      if (n.highlightEnd !== undefined) points.add(Math.max(0, Math.min(n.highlightEnd, text.length)));
    });

    const sortedPoints = Array.from(points).sort((a, b) => a - b);
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i + 1];
      const partText = text.substring(start, end);
      
      if (!partText) continue;

      // Find the latest note that covers this range (simple layering: last one wins)
      // Check if mid-point of this part is inside a note's range
      const mid = start + (end - start) / 2;
      const activeNote = segmentNotes.slice().reverse().find(n => 
        n.highlightStart !== undefined && 
        n.highlightEnd !== undefined && 
        n.highlightStart <= mid && 
        n.highlightEnd >= mid
      );

      if (activeNote) {
        elements.push(
          <span 
            key={`${index}-${start}`}
            style={{ backgroundColor: activeNote.color || '#FDE047', color: '#000' }}
            className="rounded px-0.5 box-decoration-clone cursor-pointer transition-opacity hover:opacity-80"
            title={activeNote.content}
          >
            {partText}
          </span>
        );
      } else {
        elements.push(<span key={`${index}-${start}`}>{partText}</span>);
      }
    }

    return <>{elements}</>;
  };

  return (
    <div className="flex flex-col h-full bg-secondary/30 rounded-lg border border-gray-700 relative">
       {/* Header */}
       <div className="p-4 border-b border-gray-700 bg-secondary/50 shrink-0">
        <h3 className="font-semibold text-textMain flex items-center gap-2">
          <span className="text-green-400">📝</span> Verbal Transcript
        </h3>
        <p className="text-xs text-textMuted mt-1">
          Highlight text with your cursor to add notes.
        </p>
      </div>

      {/* Content Area - Scrollable Document */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-8 relative"
        onMouseUp={handleMouseUp}
      >
        <div className="text-lg leading-loose text-gray-300 font-serif max-w-3xl mx-auto select-text">
          {transcript.length === 0 ? (
             <div className="text-center text-textMuted italic font-sans text-sm">Transcript generating...</div>
          ) : (
            transcript.map((segment, i) => (
              <div 
                key={i}
                data-index={i}
                className="mb-2 inline relative"
              >
                {renderSegment(segment, i)}{" "}
              </div>
            ))
          )}
        </div>

        {/* Floating Input Popover */}
        {selection && (
          <div 
            className="note-popover fixed z-50 bg-secondary border border-gray-600 shadow-2xl rounded-lg p-3 w-80 animate-fade-in-up flex flex-col gap-3"
            style={{ 
              top: selection.rect.bottom + 10, 
              left: Math.min(window.innerWidth - 320, Math.max(20, selection.rect.left)) 
            }}
          >
            <div className="text-xs text-gray-400 truncate border-b border-gray-700 pb-1">
              Selected: "{selection.text}"
            </div>
            
            {/* Color Picker */}
            <div className="flex gap-2 justify-center pb-1">
              {HIGHLIGHT_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === c.hex ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>

            <textarea
              className="w-full bg-primary text-sm text-textMain p-2 rounded border border-gray-600 focus:border-accent outline-none"
              rows={2}
              placeholder="Add your analysis..."
              autoFocus
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveHighlight();
                }
              }}
            />
             <div className="flex justify-end gap-2">
               <Button 
                 variant="ghost" 
                 onClick={() => { setSelection(null); window.getSelection()?.removeAllRanges(); }} 
                 className="py-1 text-xs"
                >
                 Cancel
               </Button>
               <Button onClick={saveHighlight} className="py-1 text-xs">Save Note</Button>
             </div>
          </div>
        )}
      </div>

      {/* Footer - List of Notes */}
      <div className="h-48 shrink-0 border-t border-gray-700 bg-black/20 overflow-y-auto p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 sticky top-0 bg-transparent">Analysis Notes</h4>
        {notes.length === 0 ? (
          <p className="text-sm text-textMuted italic text-center py-4">Highlight text above to create notes.</p>
        ) : (
          <div className="space-y-2">
            {notes.map(note => {
               const quoteText = note.quote || transcript[note.transcriptSegmentIndex || 0]?.text;
               return (
                 <div 
                   key={note.id} 
                   className="bg-secondary p-3 rounded border border-gray-600 flex flex-col gap-1 hover:border-accent transition-colors group"
                   style={{ borderLeftColor: note.color, borderLeftWidth: note.color ? '4px' : '1px' }}
                 >
                    <div className="flex justify-between items-start">
                       <span 
                         className="text-xs font-mono italic truncate max-w-[80%] block opacity-90 px-1 rounded text-black"
                         style={{ backgroundColor: note.color || '#FDE047' }}
                       >
                         "{quoteText}"
                       </span>
                       <button onClick={() => onDeleteNote(note.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                    </div>
                    <p className="text-sm text-gray-200">{note.content}</p>
                 </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
};