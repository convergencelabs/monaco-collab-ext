/*
 * Copyright (c) 2019 Convergence Labs, Inc.
 *
 * This file is part of the Monaco Collaborative Extensions, which is
 * released under the terms of the MIT license. A copy of the MIT license
 * is usually provided as part of this source code package in the LICENCE
 * file. If it was not, please see <https://opensource.org/licenses/MIT>
 */

import {editor, IDisposable, IPosition} from "monaco-editor";
import {EditorContentManager} from "./EditorContentManager";
import {OnDisposed} from "./OnDisposed";
import {Validation} from "./Validation";

interface IConfiguration {
  readonly lineHeight: number;
}

function getConfiguration(editorInstance: editor.ICodeEditor): IConfiguration {
  // Support for Monaco < 0.19.0
  if (typeof (editorInstance as any).getConfiguration === "function") {
    return (editorInstance as any).getConfiguration();
  }

  return {
    lineHeight: editorInstance.getOption(editor.EditorOption.lineHeight)
  };
}

/**
 * This class implements a Monaco Content Widget to render a remote user's
 * cursor, and an optional tooltip.
 *
 * @internal
 */
export class RemoteCursorWidget implements editor.IContentWidget, IDisposable {

  private readonly _id: string;
  private readonly _editor: editor.ICodeEditor;
  private readonly _domNode: HTMLDivElement;
  private readonly _tooltipNode: HTMLDivElement | null;
  private readonly _tooltipDuration: number;
  private readonly _scrollListener: IDisposable | null;
  private readonly _onDisposed: OnDisposed;
  private readonly _contentManager: EditorContentManager;

  private _position: editor.IContentWidgetPosition | null;
  private _offset: number;
  private _hideTimer: any;
  private _disposed: boolean;

  constructor(codeEditor: editor.ICodeEditor,
              widgetId: string,
              className: string | undefined,
              color: string,
              label: string,
              tooltipEnabled: boolean,
              tooltipDuration: number,
              showTooltipOnHover: boolean,
              tooltipClassName: string | undefined,
              onDisposed: OnDisposed) {
    this._editor = codeEditor;
    this._tooltipDuration = tooltipDuration;
    this._id = `monaco-remote-cursor-${widgetId}`;
    this._onDisposed = onDisposed;

    // Create the main node for the cursor element.
    const {lineHeight} = getConfiguration(this._editor);
    this._domNode = document.createElement("div");
    this._domNode.className = classNames('monaco-remote-cursor', className)
    this._domNode.style.background = color;
    this._domNode.style.height = `${lineHeight}px`;

    // Create the tooltip element if the tooltip is enabled.
    if (tooltipEnabled) {
      this._tooltipNode = document.createElement("div");
      this._tooltipNode.className = classNames('monaco-remote-cursor-tooltip', tooltipClassName)
      this._tooltipNode.style.background = color;
      this._tooltipNode.innerText = label;
      this._domNode.appendChild(this._tooltipNode);

      // we only need to listen to scroll positions to update the
      // tooltip location on scrolling.
      this._scrollListener = this._editor.onDidScrollChange(() => {
        this._updateTooltipPosition();
      });

      if (showTooltipOnHover) {
        this._domNode.style.pointerEvents = 'auto';
        this._domNode.addEventListener('mouseover', () => {
          this._setTooltipVisible(true);
        })
        this._domNode.addEventListener('mouseout', () => {
          this._setTooltipVisible(false);
        })
      }
    } else {
      this._tooltipNode = null;
      this._scrollListener = null;
    }

    this._contentManager = new EditorContentManager({
      editor: this._editor,
      onInsert: this._onInsert,
      onReplace: this._onReplace,
      onDelete: this._onDelete
    });

    this._hideTimer = null;
    this._editor.addContentWidget(this);

    this._offset = -1;

    this._disposed = false;
  }

  public hide(): void {
    this._domNode.style.display = "none";
  }

  public show(): void {
    this._domNode.style.display = "inherit";
  }

  public setOffset(offset: number): void {
    Validation.assertNumber(offset, "offset");

    const position = this._editor.getModel().getPositionAt(offset);
    this.setPosition(position);
  }

  public setPosition(position: IPosition): void {
    Validation.assertPosition(position, "position");

    this._updatePosition(position);

    if (this._tooltipNode !== null) {
      setTimeout(() => this._showTooltip(), 0);
    }
  }

  public isDisposed(): boolean {
    return this._disposed;
  }

  public dispose(): void {
    if (this._disposed) {
      return;
    }

    this._editor.removeContentWidget(this);
    if (this._scrollListener !== null) {
      this._scrollListener.dispose();
    }

    this._contentManager.dispose();

    this._disposed = true;

    this._onDisposed();
  }

  public getId(): string {
    return this._id;
  }

  public getDomNode(): HTMLElement {
    return this._domNode;
  }

  public getPosition(): editor.IContentWidgetPosition | null {
    return this._position;
  }

  private _updatePosition(position: IPosition): void {
    this._position = {
      position: {...position},
      preference: [editor.ContentWidgetPositionPreference.EXACT]
    };

    this._offset = this._editor.getModel().getOffsetAt(position);

    this._editor.layoutContentWidget(this);
  }

  private _showTooltip(): void {
    this._setTooltipVisible(true);

    this._hideTimer = setTimeout(() => {
      this._setTooltipVisible(false);
    }, this._tooltipDuration);
  }

  private _updateTooltipPosition(): void {
    const distanceFromTop = this._domNode.offsetTop - this._editor.getScrollTop();
    if (distanceFromTop - this._tooltipNode.offsetHeight < 5) {
      this._tooltipNode.style.top = `${this._tooltipNode.offsetHeight + 2}px`;
    } else {
      this._tooltipNode.style.top = `-${this._tooltipNode.offsetHeight}px`;
    }

    this._tooltipNode.style.left = "0";
  }

  private _setTooltipVisible(visible: boolean): void {
    if (this._hideTimer !== null) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
    if (visible) {
      this._updateTooltipPosition();
      this._tooltipNode.style.opacity = "1.0";
    } else {
      this._tooltipNode.style.opacity = "0";
    }
  }

  private _onInsert = (index: number, text: string) => {
    if (this._position === null) {
      return;
    }

    const offset = this._offset;
    if (index <= offset) {
      const newOffset = offset + text.length;
      const position = this._editor.getModel().getPositionAt(newOffset);
      this._updatePosition(position);
    }
  }

  private _onReplace = (index: number, length: number, text: string) => {
    if (this._position === null) {
      return;
    }

    const offset = this._offset;
    if (index <= offset) {
      const newOffset = (offset - Math.min(offset - index, length)) + text.length;
      const position = this._editor.getModel().getPositionAt(newOffset);
      this._updatePosition(position);
    }
  }

  private _onDelete = (index: number, length: number) => {
    if (this._position === null) {
      return;
    }

    const offset = this._offset;
    if (index <= offset) {
      const newOffset = offset - Math.min(offset - index, length);
      const position = this._editor.getModel().getPositionAt(newOffset);
      this._updatePosition(position);
    }
  }
}

function classNames(...names: (string|undefined|null)[]) {
  return names.filter(className => className != null && className.length > 0).join(' ')
}