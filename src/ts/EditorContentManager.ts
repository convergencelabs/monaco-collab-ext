/*
 * Copyright (c) 2019 Convergence Labs, Inc.
 *
 * This file is part of the Monaco Collaborative Extensions, which is
 * released under the terms of the MIT license. A copy of the MIT license
 * is usually provided as part of this source code package in the LICENCE
 * file. If it was not, please see <https://opensource.org/licenses/MIT>
 */

import * as monaco from "monaco-editor";
import {editor, IDisposable} from "monaco-editor";
import {Validation} from "./Validation";

/**
 * The IEditorContentManagerOptions interface represents the set of options that
 * configures how the EditorContentManager behaves.
 */
export interface IEditorContentManagerOptions {
  /**
   * The instance of the Monaco editor to add the remote cursors to.
   */
  editor: monaco.editor.ICodeEditor;

  /**
   * Handles cases where text was inserted into the editor.
   *
   * @param index
   *   The zero-based offset where the text insert occurred.
   * @param text
   *   the text that was inserted.
   */
  onInsert?: (index: number, text: string) => void;

  /**
   * Handles cases where text was replaced in the editor.
   *
   * @param index
   *   The zero-based offset at the beginning of the replaced range.
   * @param length
   *   The length of the range that was replaced.
   * @param text
   *   the text that was inserted.
   */
  onReplace?: (index: number, length: number, text: string) => void;

  /**
   * Handles cases where text was deleted from the editor.
   *
   * @param index
   *   The zero-based offset at the beginning of the removed range.
   * @param length
   *   The length of the range that was removed.
   */
  onDelete?: (index: number, length: number) => void;

  /**
   * The source id that will be used when making remote edits.
   */
  remoteSourceId?: string;
}

/**
 * The EditorContentManager facilitates listening to local content changes and
 * the playback of remote content changes into the editor.
 */
export class EditorContentManager {

  /**
   * Option defaults.
   *
   * @internal
   */
  private static readonly _DEFAULTS = {
    onInsert: () => {
      // no-op
    },
    onReplace: () => {
      // no-op
    },
    onDelete: () => {
      // no-op
    },
    remoteSourceId: "remote"
  };

  /**
   * The options that configure the EditorContentManager.
   * @internal
   */
  private readonly _options: IEditorContentManagerOptions;

  /**
   * A flag denoting if outgoing events should be suppressed.
   * @internal
   */
  private _suppress: boolean;

  /**
   * A callback to dispose of the content change listener.
   * @internal
   */
  private _disposer: IDisposable;

  /**
   * Constructs a new EditorContentManager using the supplied options.
   *
   * @param options
   *   The options that configure the EditorContentManager.
   */
  constructor(options: IEditorContentManagerOptions) {
    this._options = {...EditorContentManager._DEFAULTS, ...options};

    Validation.assertDefined(this._options, "options");
    Validation.assertDefined(this._options.editor, "options.editor");
    Validation.assertFunction(this._options.onInsert, "options.onInsert");
    Validation.assertFunction(this._options.onReplace, "options.onReplace");
    Validation.assertFunction(this._options.onDelete, "options.onDelete");

    this._disposer = this._options.editor.onDidChangeModelContent(this._onContentChanged);
  }

  /**
   * Inserts text into the editor.
   *
   * @param index
   *   The index to insert text at.
   * @param text
   *   The text to insert.
   */
  public insert(index: number, text: string): void {
    this._suppress = true;
    const {editor: ed, remoteSourceId} = this._options;
    const position = ed.getModel().getPositionAt(index);

    ed.executeEdits(remoteSourceId, [{
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      ),
      text,
      forceMoveMarkers: true
    }]);
    this._suppress = false;
  }

  /**
   * Replaces text in the editor.
   *
   * @param index
   *   The start index of the range to replace.
   * @param length
   *   The length of the  range to replace.
   * @param text
   *   The text to insert.
   */
  public replace(index: number, length: number, text: string): void {
    this._suppress = true;
    const {editor: ed, remoteSourceId} = this._options;
    const start = ed.getModel().getPositionAt(index);
    const end = ed.getModel().getPositionAt(index + length);

    ed.executeEdits(remoteSourceId, [{
      range: new monaco.Range(
        start.lineNumber,
        start.column,
        end.lineNumber,
        end.column
      ),
      text,
      forceMoveMarkers: true
    }]);
    this._suppress = false;
  }

  /**
   * Deletes text in the editor.
   *
   * @param index
   *   The start index of the range to remove.
   * @param length
   *   The length of the  range to remove.
   */
  public delete(index: number, length: number): void {
    this._suppress = true;
    const {editor: ed, remoteSourceId} = this._options;
    const start = ed.getModel().getPositionAt(index);
    const end = ed.getModel().getPositionAt(index + length);

    ed.executeEdits(remoteSourceId, [{
      range: new monaco.Range(
        start.lineNumber,
        start.column,
        end.lineNumber,
        end.column
      ),
      text: "",
      forceMoveMarkers: true
    }]);
    this._suppress = false;
  }

  /**
   * Disposes of the content manager, freeing any resources.
   */
  public dispose(): void {
    this._disposer.dispose();
  }

  /**
   * A helper method to process local changes from Monaco.
   *
   * @param e
   *   The event to process.
   * @private
   * @internal
   */
  private _onContentChanged = (e: editor.IModelContentChangedEvent) => {
    if (!this._suppress) {
      e.changes.forEach((change: editor.IModelContentChange) => this._processChange(change));
    }
  }

  /**
   * A helper method to process a single content change.
   *
   * @param change
   *   The change to process.
   * @private
   * @internal
   */
  private _processChange(change: editor.IModelContentChange): void {
    Validation.assertDefined(change, "change");
    const {rangeOffset, rangeLength, text} = change;
    if (text.length > 0 && rangeLength === 0) {
      this._options.onInsert(rangeOffset, text);
    } else if (text.length > 0 && rangeLength > 0) {
      this._options.onReplace(rangeOffset, rangeLength, text);
    } else if (text.length === 0 && rangeLength > 0) {
      this._options.onDelete(rangeOffset, rangeLength);
    } else {
      throw new Error("Unexpected change: " + JSON.stringify(change));
    }
  }
}
