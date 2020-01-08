/*
 * Copyright (c) 2019 Convergence Labs, Inc.
 *
 * This file is part of the Monaco Collaborative Extensions, which is
 * released under the terms of the MIT license. A copy of the MIT license
 * is usually provided as part of this source code package in the LICENCE
 * file. If it was not, please see <https://opensource.org/licenses/MIT>
 */

import * as monaco from "monaco-editor";
import {IPosition} from "monaco-editor";
import {RemoteSelection} from "./RemoteSelection";
import {Validation} from "./Validation";

/**
 * The IRemoteSelectionManagerOptions represents the options that
 * configure the behavior a the RemoteSelectionManager.
 */
export interface IRemoteSelectionManagerOptions {
  /**
   * The Monaco Editor instance to render the remote selections into.
   */
  editor: monaco.editor.ICodeEditor;
}

/**
 * The RemoteSelectionManager renders remote users selections into the Monaco
 * editor using the editor's built-in decorators mechanism.
 */
export class RemoteSelectionManager {

  /**
   * A internal unique identifier for each selection.
   *
   * @internal
   */
  private _nextClassId: number;

  /**
   * Tracks the current remote selections.
   *
   * @internal
   */
  private readonly _remoteSelections: Map<string, RemoteSelection>;

  /**
   * The options configuring this instance.
   *
   * @internal
   */
  private readonly _options: IRemoteSelectionManagerOptions;

  /**
   * Creates a new RemoteSelectionManager with the specified options.
   *
   * @param options
   *   Ths options that configure the RemoteSelectionManager.
   */
  constructor(options: IRemoteSelectionManagerOptions) {
    Validation.assertDefined(options, "options");

    this._remoteSelections = new Map<string, RemoteSelection>();
    this._options = options;
    this._nextClassId = 0;
  }

  /**
   * Adds a new remote selection with a unique id and the specified color.
   *
   * @param id
   *   The unique id of the selection.
   * @param color
   *   The color to render the selection with.
   */
  public addSelection(id: string, color: string, label?: string): RemoteSelection {
    const onDisposed = () => {
      this.removeSelection(id);
    };
    const selection = new RemoteSelection(this._options.editor, id, this._nextClassId++, color, label, onDisposed);
    this._remoteSelections.set(id, selection);
    return selection;
  }

  /**
   * Removes an existing remote selection from the editor.
   *
   * @param id
   *   The unique id of the selection.
   */
  public removeSelection(id: string): void {
    const remoteSelection = this._getSelection(id);
    if (!remoteSelection.isDisposed()) {
      remoteSelection.dispose();
    }
  }

  /**
   * Sets the selection using zero-based text offset locations.
   *
   * @param id
   *   The unique id of the selection.
   * @param start
   *   The starting offset of the selection.
   * @param end
   *   The ending offset of the selection.
   */
  public setSelectionOffsets(id: string, start: number, end: number): void {
    const remoteSelection = this._getSelection(id);
    remoteSelection.setOffsets(start, end);
  }

  /**
   * Sets the selection using the Monaco Editor's IPosition (line numbers and columns)
   * location concept.
   *
   * @param id
   *   The unique id of the selection.
   * @param start
   *   The starting position of the selection.
   * @param end
   *   The ending position of the selection.
   */
  public setSelectionPositions(id: string, start: IPosition, end: IPosition): void {
    const remoteSelection = this._getSelection(id);
    remoteSelection.setPositions(start, end);
  }

  /**
   * Shows the specified selection, if it is currently hidden.
   *
   * @param id
   *   The unique id of the selection.
   */
  public showSelection(id: string): void {
    const remoteSelection = this._getSelection(id);
    remoteSelection.show();
  }

  /**
   * Hides the specified selection, if it is currently shown.
   *
   * @param id
   *   The unique id of the selection.
   */
  public hideSelection(id: string): void {
    const remoteSelection = this._getSelection(id);
    remoteSelection.hide();
  }

  /**
   * A helper method that gets a cursor by id, or throws an exception.
   * @internal
   */
  private _getSelection(id: string): RemoteSelection {
    if (!this._remoteSelections.has(id)) {
      throw new Error("No such selection: " + id);
    }

    return this._remoteSelections.get(id);
  }
}
