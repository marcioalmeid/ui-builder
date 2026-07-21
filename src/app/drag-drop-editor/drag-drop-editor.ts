import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DraggableItem {
  id: string;
  type: 'text' | 'image' | 'button';
  content: string;
  styles?: Record<string, string>;
}

@Component({
  selector: 'app-drag-drop-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-100 p-6">
      <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">Drag & Drop Editor</h1>

      <!-- Teste -->
      <div class="mb-6 bg-blue-100 p-4 rounded">
        Isso é um teste
      </div>

      <!-- Toolbar -->
      <div class="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-2">
        <button
          (click)="addItem('text')"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Add Text
        </button>
        <button
          (click)="addItem('image')"
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Add Image
        </button>
        <button
          (click)="addItem('button')"
          class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          Add Button
        </button>
        <button
          (click)="clearAll()"
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors ml-auto"
        >
          Clear All
        </button>
      </div>

      <!-- Canvas -->
      <div
        class="bg-white rounded-lg shadow-md p-4 min-h-[500px] border-2 border-dashed border-gray-300 relative"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
        [class.drag-over]="isDragging()"
      >
        <div
          class="absolute inset-0 flex items-center justify-center pointer-events-none"
          *ngIf="items().length === 0"
        >
          <p class="text-gray-500 text-lg">Drag items here or use the toolbar</p>
        </div>

        <div
          *ngFor="let item of items(); trackBy: trackByFn"
          class="mb-4 cursor-move relative group"
          [attr.data-id]="item.id"
          draggable="true"
          (dragstart)="onDragStart($event, item)"
          (dragend)="onDragEnd($event)"
        >
          <div
            class="p-4 rounded-lg shadow-sm border border-gray-200 bg-white transition-all hover:shadow-md"
            [ngClass]="{
              'bg-blue-50 border-blue-200': item.type === 'text',
              'bg-green-50 border-green-200': item.type === 'image',
              'bg-purple-50 border-purple-200': item.type === 'button'
            }"
          >
            <div class="flex justify-between items-start mb-2">
              <span class="text-xs font-semibold px-2 py-1 rounded bg-gray-200 text-gray-700">
                {{ item.type }}
              </span>
              <button
                (click)="removeItem(item.id)"
                class="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove"
              >
                ✕
              </button>
            </div>

            <div [ngSwitch]="item.type">
              <p *ngSwitchCase="'text'" class="text-gray-800 whitespace-pre-wrap">{{ item.content }}</p>
              <img *ngSwitchCase="'image'" [src]="item.content" [alt]="item.content" class="max-w-full h-auto rounded">
              <button *ngSwitchCase="'button'" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                {{ item.content }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div class="mt-8 bg-white rounded-lg shadow-md p-4">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">Preview</h2>
        <div class="border border-gray-300 rounded p-4 min-h-[200px]">
          <div *ngFor="let item of items(); trackBy: trackByFn">
            <div [ngSwitch]="item.type" class="mb-4">
              <p *ngSwitchCase="'text'" class="text-gray-800 whitespace-pre-wrap">{{ item.content }}</p>
              <img *ngSwitchCase="'image'" [src]="item.content" [alt]="item.content" class="max-w-full h-auto rounded">
              <button *ngSwitchCase="'button'" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                {{ item.content }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .drag-over {
      border-color: #3b82f6 !important;
      background-color: #eff6ff !important;
    }
  `
})
export class DragDropEditorComponent {
  items = signal<DraggableItem[]>([]);
  isDragging = signal(false);
  dragItem: DraggableItem | null = null;

  trackByFn(index: number, item: DraggableItem) {
    return item.id;
  }

  addItem(type: 'text' | 'image' | 'button') {
    const newItem: DraggableItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: type === 'text' ? 'Sample text content' : 
               type === 'image' ? 'https://via.placeholder.com/150' : 
               'Click me'
    };
    
    this.items.update(items => [...items, newItem]);
  }

  removeItem(id: string) {
    this.items.update(items => items.filter(item => item.id !== id));
  }

  clearAll() {
    this.items.set([]);
  }

  onDragStart(event: DragEvent, item: DraggableItem) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', item.id);
      event.dataTransfer.effectAllowed = 'move';
      this.dragItem = item;
      this.isDragging.set(true);
    }
  }

  onDragEnd(event: DragEvent) {
    this.isDragging.set(false);
    this.dragItem = null;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    
    if (event.dataTransfer && this.dragItem) {
      const draggedId = event.dataTransfer.getData('text/plain');
      
      // Only move if we're moving to a different position
      if (draggedId !== this.dragItem.id) {
        const currentIndex = this.items().findIndex(item => item.id === draggedId);
        const targetIndex = this.items().findIndex(item => item.id === this.dragItem?.id);
        
        if (currentIndex !== -1 && targetIndex !== -1) {
          const newItems = [...this.items()];
          const [removed] = newItems.splice(currentIndex, 1);
          newItems.splice(targetIndex, 0, removed);
          this.items.set(newItems);
        }
      }
    }
    
    this.isDragging.set(false);
    this.dragItem = null;
  }
}
