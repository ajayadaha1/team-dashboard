import { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import ImageExt from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';

import {
  Box,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  type SelectChangeEvent,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import ImageIcon from '@mui/icons-material/Image';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import TableChartIcon from '@mui/icons-material/TableChart';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import CodeIcon from '@mui/icons-material/Code';

interface RichTextEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  /** Externally set content (for live collaboration) */
  remoteContent?: string;
  /** Increment to force re-application of remoteContent */
  remoteVersion?: number;
}

const COLORS = [
  '#000000', '#e53935', '#fb8c00', '#43a047',
  '#1e88e5', '#8e24aa', '#6d4c41', '#546e7a',
];

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const handleHeading = (e: SelectChangeEvent<string>) => {
    const val = e.target.value;
    if (val === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(val) as 1 | 2 | 3 | 4 | 5 | 6;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  const currentHeading = (() => {
    for (const l of [1, 2, 3, 4, 5, 6] as const) {
      if (editor.isActive('heading', { level: l })) return String(l);
    }
    return 'paragraph';
  })();

  const insertImage = () => {
    const url = prompt('Image URL:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const insertLink = () => {
    const url = prompt('Link URL:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 0.25,
        px: 1,
        py: 0.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Heading selector */}
      <Select
        size="small"
        variant="standard"
        value={currentHeading}
        onChange={handleHeading}
        sx={{ minWidth: 110, fontSize: '0.85rem', mr: 0.5 }}
        disableUnderline
      >
        <MenuItem value="paragraph">Paragraph</MenuItem>
        <MenuItem value="1">Heading 1</MenuItem>
        <MenuItem value="2">Heading 2</MenuItem>
        <MenuItem value="3">Heading 3</MenuItem>
      </Select>

      <Btn tip="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} icon={<FormatBoldIcon />} />
      <Btn tip="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} icon={<FormatUnderlinedIcon />} />
      <Btn tip="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} icon={<FormatItalicIcon />} />

      <ToolDivider />

      {/* List */}
      <Btn tip="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<FormatListBulletedIcon />} />
      <Btn tip="Ordered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} icon={<FormatListNumberedIcon />} />

      <ToolDivider />

      {/* Alignment */}
      <Btn tip="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} icon={<FormatAlignLeftIcon />} />
      <Btn tip="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} icon={<FormatAlignCenterIcon />} />
      <Btn tip="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} icon={<FormatAlignRightIcon />} />
      <Btn tip="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} icon={<FormatAlignJustifyIcon />} />

      <ToolDivider />

      {/* Text color */}
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <Tooltip title="Text color">
          <IconButton size="small">
            <FormatColorTextIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box
          component="select"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            editor.chain().focus().setColor(e.target.value).run();
          }}
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          {COLORS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Box>
      </Box>

      <ToolDivider />

      {/* Insert */}
      <Btn tip="Image" onClick={insertImage} icon={<ImageIcon />} />
      <Btn tip="Emoji" onClick={() => {
        const emoji = prompt('Paste emoji:');
        if (emoji) editor.chain().focus().insertContent(emoji).run();
      }} icon={<InsertEmoticonIcon />} />
      <Btn tip="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} icon={<FormatQuoteIcon />} />
      <Btn tip="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} icon={<CodeIcon />} />
      <Btn tip="Table" onClick={insertTable} icon={<TableChartIcon />} />

      <ToolDivider />

      <Btn tip="Link" onClick={insertLink} icon={<LinkIcon />} />
      <Btn tip="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={<AddIcon />} />

      <ToolDivider />

      <Btn tip="Undo" onClick={() => editor.chain().focus().undo().run()} icon={<UndoIcon />} />
      <Btn tip="Redo" onClick={() => editor.chain().focus().redo().run()} icon={<RedoIcon />} />

    </Box>
  );
}

function Btn({ tip, icon, onClick, active }: { tip: string; icon: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <Tooltip title={tip}>
      <IconButton
        size="small"
        onClick={onClick}
        sx={{
          borderRadius: 1,
          bgcolor: active ? 'action.selected' : undefined,
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}

function ToolDivider() {
  return <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />;
}

export default function RichTextEditor({ content, onUpdate, remoteContent, remoteVersion }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      ImageExt,
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight.configure({ multicolor: true }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      if (isRemoteUpdate.current) return;
      onUpdate(e.getHTML());
    },
  });

  // Guard to prevent onUpdate from firing when we apply remote content
  const isRemoteUpdate = useRef(false);

  // Apply content prop changes (initial load, week switch, API reload)
  useEffect(() => {
    if (editor) {
      const current = editor.getHTML();
      if (current !== content) {
        isRemoteUpdate.current = true;
        editor.commands.setContent(content, false);
        isRemoteUpdate.current = false;
      }
    }
  }, [editor, content]);

  // Apply remote content updates (live collaboration)
  // Uses remoteVersion to guarantee the effect fires on every broadcast
  useEffect(() => {
    if (remoteContent !== undefined && editor) {
      isRemoteUpdate.current = true;
      const { from, to } = editor.state.selection;
      editor.commands.setContent(remoteContent, false);
      const maxPos = editor.state.doc.content.size;
      editor.commands.setTextSelection({
        from: Math.min(from, maxPos),
        to: Math.min(to, maxPos),
      });
      isRemoteUpdate.current = false;
    }
  }, [editor, remoteContent, remoteVersion]);

  return (
    <>
      <style>{`
        .tiptap ul,
        .tiptap ol {
          padding-left: 1.5em !important;
          margin-top: 0.25em !important;
          margin-bottom: 0.25em !important;
        }
        .tiptap ul { list-style-type: disc !important; }
        .tiptap ol { list-style-type: decimal !important; }
        .tiptap ul ul { list-style-type: circle !important; }
        .tiptap ul ul ul { list-style-type: square !important; }
        .tiptap li { display: list-item !important; }
        .tiptap li p { margin: 0 !important; }
      `}</style>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          '& .tiptap': {
            minHeight: 200,
            p: 2,
            outline: 'none',
            '& table': {
              borderCollapse: 'collapse',
              width: '100%',
              '& td, & th': {
                border: '1px solid',
                borderColor: 'divider',
                px: 1,
                py: 0.5,
                minWidth: 60,
              },
              '& th': {
                bgcolor: 'action.hover',
                fontWeight: 'bold',
              },
            },
            '& img': {
              maxWidth: '100%',
              height: 'auto',
            },
            '& blockquote': {
              borderLeft: '3px solid',
              borderColor: 'divider',
              pl: 2,
              ml: 0,
              color: 'text.secondary',
            },
          },
        }}
      >
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </Box>
    </>
  );
}
