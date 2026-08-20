import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormElementsMenu } from '../form-elements-menu/form-elements-menu';
import { DataBindingsPanel } from '../data-bindings-panel/data-bindings-panel';
import { DataChecklist } from '../data-checklist/data-checklist';
import { WorkflowRulesPanel } from '../workflow-rules-panel/workflow-rules-panel';
import { FormService, BuilderSidebarSection } from '../../services/form.services';
import { TASK_TEMPLATE_CONTEXTS } from '../../models/task-template';
import {
  getDefaultExpandedSections,
  getSectionUnavailableHint,
  isSidebarSectionRelevant,
} from '../../utils/template-context-ui';
import { setupStepFromSidebarSection } from '../../utils/template-readiness';

type AuthoringSection = Exclude<BuilderSidebarSection, 'template'>;

interface SidebarSectionView {
  id: AuthoringSection;
  title: string;
  hint: string;
  relevant: boolean;
  unavailableHint: string | null;
  expanded: boolean;
}

@Component({
  selector: 'app-builder-sidebar',
  standalone: true,
  imports: [
    MatIconModule,
    FormElementsMenu,
    DataBindingsPanel,
    DataChecklist,
    WorkflowRulesPanel,
  ],
  templateUrl: './builder-sidebar.html',
  styleUrl: './builder-sidebar.css',
})
export class BuilderSidebar {
  formService = inject(FormService);
  focusedSection = signal<BuilderSidebarSection | null>(null);
  expandedSections = signal<Set<BuilderSidebarSection>>(new Set(['fields']));

  templateContext = computed(() => this.formService.activeTemplate()?.context ?? 'general');

  contextLabel = computed(() => {
    const contextId = this.templateContext();
    return (
      TASK_TEMPLATE_CONTEXTS.find((item) => item.id === contextId)?.label ??
      contextId ??
      'Task'
    );
  });

  sections = computed((): SidebarSectionView[] => {
    const context = this.templateContext();
    const expanded = this.expandedSections();

    const defs: Array<{ id: AuthoringSection; title: string; hint: string }> = [
      { id: 'fields', title: 'Fields', hint: 'Layout & actions at top — Button, then input fields below' },
      {
        id: 'data',
        title: 'Data',
        hint: 'Click a field below — connection options open on the right',
      },
      {
        id: 'rules',
        title: 'Rules',
        hint: 'Show/hide fields and emit events on conditions',
      },
    ];

    return defs.map((def) => ({
      ...def,
      relevant: isSidebarSectionRelevant(def.id, context),
      unavailableHint: getSectionUnavailableHint(def.id, context),
      expanded: expanded.has(def.id),
    }));
  });

  constructor() {
    effect(() => {
      const context = this.templateContext();
      this.expandedSections.set(getDefaultExpandedSections(context));
    });

    effect(() => {
      if (this.formService.activeSetupStep() === 'layout') {
        this.expandedSections.update((current) => new Set([...current, 'fields']));
        queueMicrotask(() => {
          document
            .getElementById('sidebar-section-fields')
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    });

    effect(() => {
      const focus = this.formService.sidebarFocus();
      if (!focus || focus.section === 'template') return;

      if (isSidebarSectionRelevant(focus.section, this.templateContext())) {
        this.expandedSections.update((current) => new Set([...current, focus.section]));
      }

      queueMicrotask(() => {
        const section = document.getElementById(`sidebar-section-${focus.section}`);
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.focusedSection.set(focus.section);
        window.setTimeout(() => this.focusedSection.set(null), 1800);
      });
    });
  }

  toggleSection(section: AuthoringSection) {
    const context = this.templateContext();
    if (!isSidebarSectionRelevant(section, context)) return;

    this.expandedSections.update((current) => {
      const next = new Set(current);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
        this.formService.setActiveSetupStep(setupStepFromSidebarSection(section));
      }
      return next;
    });
  }

  isExpanded(section: AuthoringSection): boolean {
    return this.expandedSections().has(section);
  }
}
