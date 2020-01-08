/*
 * Copyright (c) 2019 Convergence Labs, Inc.
 *
 * This file is part of the Monaco Collaborative Extensions, which is
 * released under the terms of the MIT license. A copy of the MIT license
 * is usually provided as part of this source code package in the LICENCE
 * file. If it was not, please see <https://opensource.org/licenses/MIT>
 */

import * as monaco from "monaco-editor";
import {editor, IPosition} from "monaco-editor";
import {OnDisposed} from "./OnDisposed";
import {Validation} from "./Validation";

export class RemoteSelection {

  /**
   * A helper method to add a style tag to the head of the document that will
   * style the color of the selection. The Monaco Editor only allows setting
   * the class name of decorations, so we can not set a style property directly.
   * This method will create, add, and return the style tag for this element.
   *
   * @param className
   *   The className to use as the css selector.
   * @param color
   *   The color to set for the selection.
   * @returns
   *   The style element that was added to the document head.
   *
   * @private
   * @internal
   */
  private static _addDynamicStyleElement(className: string, color: string): HTMLStyleElement {
    Validation.assertString(className, "className");
    Validation.assertString(color, "color");

    const css =
      `.${className} {
         background-color: ${color};
       }`.trim();

    const styleElement = document.createElement("style");
    styleElement.innerText = css;
    document.head.appendChild(styleElement);

    return styleElement;
  }

  /**
   * A helper method to ensure the start position is before the end position.
   *
   * @param start
   *   The current start position.
   * @param end
   *   The current end position.
   * @return
   *   An object containing the correctly ordered start and end positions.
   *
   * @private
   * @internal
   */
  private static _swapIfNeeded(start: IPosition, end: IPosition): { start: IPosition, end: IPosition } {
    if (start.lineNumber < end.lineNumber || (start.lineNumber === end.lineNumber && start.column <= end.column)) {
      return {start, end};
    } else {
      return {start: end, end: start};
    }
  }

  /**
   * The userland id of the selection.
   * @internal
   */
  private readonly _id: string;

  /**
   * The css classname to apply to the Monaco decoration.
   * @internal
   */
  private readonly _className: string;

  /**
   * The HTML Style element added to the document to color the selection.
   * @internal
   */
  private readonly _styleElement: HTMLStyleElement;

  /**
   * The label to display on hover
   * @internal
   */
  private readonly _label: string;

  /**
   * The Monaco editor instance to render selection into.
   * @internal
   */
  private readonly _editor: editor.ICodeEditor;

  /**
   * An internal callback used to dispose of the selection.
   * @internal
   */
  private readonly _onDisposed: OnDisposed;

  /**
   * The current start position of the selection.
   * @internal
   */
  private _startPosition: IPosition;

  /**
   * The current end position of the selection.
   * @internal
   */
  private _endPosition: IPosition;

  /**
   * The id's of the current Monaco decorations rendering the selection.
   * @internal
   */
  private _decorations: string[];

  /**
   * A flag determining if the selection has been disposed.
   * @internal
   */
  private _disposed: boolean;

  /**
   * Constructs a new remote selection.
   *
   * @internal
   */
  constructor(
    codeEditor: editor.ICodeEditor,
    id: string,
    classId: number,
    color: string,
    label: string,
    onDisposed: OnDisposed
  ) {
    this._editor = codeEditor;
    this._id = id;
    const uniqueClassId = `monaco-remote-selection-${classId}`;
    this._className = `monaco-remote-selection ${uniqueClassId}`;
    this._styleElement = RemoteSelection._addDynamicStyleElement(uniqueClassId, color);
    this._label = label;
    this._decorations = [];
    this._onDisposed = onDisposed;
  }

  /**
   * Gets the userland id of this selection.
   */
  public getId(): string {
    return this._id;
  }

  /**
   * Gets the start position of the selection.
   *
   * @returns
   *   The start position of the selection.
   */
  public getStartPosition(): IPosition {
    return {...this._startPosition};
  }

  /**
   * Gets the start position of the selection.
   *
   * @returns
   *   The start position of the selection.
   */
  public getEndPosition(): IPosition {
    return {...this._endPosition};
  }

  /**
   * Sets the selection using zero-based text indices.
   *
   * @param start
   *   The start offset to set the selection to.
   * @param end
   *   The end offset to set the selection to.
   */
  public setOffsets(start: number, end: number): void {
    const startPosition = this._editor.getModel().getPositionAt(start);
    const endPosition = this._editor.getModel().getPositionAt(end);

    this.setPositions(startPosition, endPosition);
  }

  /**
   * Sets the selection using Monaco's line-number / column coordinate system.
   *
   * @param start
   *   The start position to set the selection to.
   * @param end
   *   The end position to set the selection to.
   */
  public setPositions(start: IPosition, end: IPosition): void {
    // this._decorations = this._editor.deltaDecorations(this._decorations, []);
    const ordered = RemoteSelection._swapIfNeeded(start, end);
    this._startPosition = ordered.start;
    this._endPosition = ordered.end;
    this._render();
  }

  /**
   * Makes the selection visible if it is hidden.
   */
  public show(): void {
    this._render();
  }

  /**
   * Makes the selection hidden if it is visible.
   */
  public hide(): void {
    this._decorations = this._editor.deltaDecorations(this._decorations, []);
  }

  /**
   * Determines if the selection has been permanently removed from the editor.
   *
   * @returns
   *   True if the selection has been disposed, false otherwise.
   */
  public isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Permanently removes the selection from the editor.
   */
  public dispose(): void {
    if (!this._disposed) {
      this._styleElement.parentElement.removeChild(this._styleElement);
      this.hide();
      this._disposed = true;
      this._onDisposed();
    }
  }

  /**
   * A helper method that actually renders the selection as a decoration within
   * the Monaco Editor.
   *
   * @private
   * @internal
   */
  private _render(): void {
    this._decorations = this._editor.deltaDecorations(this._decorations,
      [
        {
          range: new monaco.Range(
            this._startPosition.lineNumber,
            this._startPosition.column,
            this._endPosition.lineNumber,
            this._endPosition.column
          ),
          options: {
            className: this._className,
            hoverMessage: this._label != null ? {
              value: this._label
            } : null
          }
        }
      ]
    );
  }
}
