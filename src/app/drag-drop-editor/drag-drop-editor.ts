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
  templateUrl: './drag-drop-editor.html', 
  styleUrls: ['./drag-drop-editor.css'], 
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
