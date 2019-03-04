const sourceUser = {
  id: "source",
  label: "Source User",
  color: "orange"
};

const staticUser = {
  id: "static",
  label: "Static User",
  color: "blue"
};

require.config({ paths: { 'vs': '../node_modules/monaco-editor/min/vs' }});
require(['vs/editor/editor.main', 'MonacoCollabExt'], function(m, MonacoCollabExt) {

  //
  // Create the target editor where events will be played into.
  //
  const target = monaco.editor.create(document.getElementById("target-editor"), {
    value: editorContents,
    theme: "vs-dark'",
    language: 'javascript'
  });

  const remoteCursorManager = new MonacoCollabExt.RemoteCursorManager({
    editor: target,
    tooltips: true,
    tooltipDuration: 2
  });
  const sourceUserCursor = remoteCursorManager.addCursor(sourceUser.id, sourceUser.color, sourceUser.label);
  const staticUserCursor = remoteCursorManager.addCursor(staticUser.id, staticUser.color, staticUser.label);

  const remoteSelectionManager = new MonacoCollabExt.RemoteSelectionManager({editor: target});
  remoteSelectionManager.addSelection(sourceUser.id, sourceUser.color);
  remoteSelectionManager.addSelection(staticUser.id, staticUser.color);

  const targetContentManager = new MonacoCollabExt.EditorContentManager({
    editor: target
  });

  //
  // Faked other user.
  //
  staticUserCursor.setOffset(50);
  remoteSelectionManager.setSelectionOffsets(staticUser.id, 40, 50);


  //
  // Create the source editor were events will be generated.
  //
  const source = monaco.editor.create(document.getElementById("source-editor"), {
    value: editorContents,
    theme: "vs-dark'",
    language: 'javascript'
  });

  source.onDidChangeCursorPosition(e => {
    const offset = source.getModel().getOffsetAt(e.position);
    sourceUserCursor.setOffset(offset);
  });

  source.onDidChangeCursorSelection(e => {
    const startOffset = source.getModel().getOffsetAt(e.selection.getStartPosition());
    const endOffset = source.getModel().getOffsetAt(e.selection.getEndPosition());
    remoteSelectionManager.setSelectionOffsets(sourceUser.id, startOffset, endOffset);
  });

  const sourceContentManager = new MonacoCollabExt.EditorContentManager({
    editor: source,
    onInsert(index, text) {
      targetContentManager.insert(index, text);
    },
    onReplace(index, length, text) {
      targetContentManager.replace(index, length, text);
    },
    onDelete(index, length) {
      targetContentManager.delete(index, length);
    }
  });
});
