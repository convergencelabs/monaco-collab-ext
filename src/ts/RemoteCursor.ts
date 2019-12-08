/*
 * Copyright (c) 2019 Convergence Labs, Inc.
 *
 * This file is part of the Monaco Collaborative Extensions, which is
 * released under the terms of the MIT license. A copy of the MIT license
 * is usually provided as part of this source code package in the LICENCE
 * file. If it was not, please see <https://opensource.org/licenses/MIT>
 */

import {IPosition} from "monaco-editor";
import {RemoteCursorWidget} from "./RemoteCursorWidget";

/**
 * The RemoteCursor class represents a remote cursor in the MonacoEditor. This
 * class allows you to control the location and visibility of the cursor.
 */
export class RemoteCursor {

  /**
   * @internal
   */
  private readonly _delegate: RemoteCursorWidget;

  /**
   * Creates a new RemoteCursor.
   *
   * @param delegate
   *   The underlying Monaco Editor widget.
   * @internal
   * @hidden
   */
  constructor(delegate: RemoteCursorWidget) {
    this._delegate = delegate;
  }

  /**
   * Gets the unique id of this cursor.
   *
   * @returns
   *   The unique id of this cursor.
   */
  public getId(): string {
    return this._delegate.getId();
  }

  /**
   * Gets the position of the cursor.
   *
   * @returns
   *   The position of the cursor.
   */
  public getPosition(): IPosition {
    return this._delegate.getPosition().position;
  }

  /**
   * Sets the location of the cursor based on a Monaco Editor IPosition.
   *
   * @param position
   *   The line / column position of the cursor.
   */
  public setPosition(position: IPosition): void {
    this._delegate.setPosition(position);
  }

  /**
   * Sets the location of the cursor using a zero-based text offset.
   *
   * @param offset
   *   The offset of the cursor.
   */
  public setOffset(offset: number): void {
    this._delegate.setOffset(offset);
  }

  /**
   * Shows the cursor if it is hidden.
   */
  public show(): void {
    this._delegate.show();
  }

  /**
   * Hides the cursor if it is shown.
   */
  public hide(): void {
    this._delegate.hide();
  }

  /**
   * Determines if the cursor has already been disposed. A cursor is disposed
   * when it has been permanently removed from the editor.
   *
   * @returns
   *   True if the cursor has been disposed, false otherwise.
   */
  public isDisposed(): boolean {
    return this._delegate.isDisposed();
  }

  /**
   * Disposes of this cursor, removing it from the editor.
   */
  public dispose(): void {
    this._delegate.dispose();
  }
}
