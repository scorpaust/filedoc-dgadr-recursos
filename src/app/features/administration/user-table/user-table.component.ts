import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { debounceTime, switchMap, tap } from 'rxjs/operators';
import { UserListFilters, UserMockService } from '../../../core/auth/user-mock.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import {
  DropdownFilterComponent,
  DropdownFilterOption,
} from '../../../shared/components/dropdown-filter/dropdown-filter.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import {
  SegmentedControlComponent,
  SegmentedControlOption,
} from '../../../shared/components/segmented-control/segmented-control.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AppUser, USER_ROLE_LABELS, UserRole, UserStatus } from '../../../shared/models';
import { CreateUserDialogComponent } from '../create-user-dialog/create-user-dialog.component';
import { EditRolesDialogComponent } from '../edit-roles-dialog/edit-roles-dialog.component';
import { ROLE_PILL_TONES } from '../role-pill-tone.util';

type StatusFilter = UserStatus | 'all';

const STATUS_OPTIONS: readonly SegmentedControlOption<StatusFilter>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
];

const ROLE_OPTIONS: readonly DropdownFilterOption[] = (
  ['EMPLOYEE', 'CONTENT_EDITOR', 'SUPPORT_AGENT', 'ADMIN'] satisfies readonly UserRole[]
).map((role) => ({ value: role, label: USER_ROLE_LABELS[role] }));

const SEARCH_DEBOUNCE_MS = 250;
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short' });

// Tabela de gestão de utilizadores mock (Fase 9 — UI, tarefa B), reaproveitando o padrão
// "pesquisa + dropdown de função + segmentado de estado + tabela de ações" já validado no
// catálogo de recursos (Fase 3) e na gestão de conteúdos (Fase 8).
@Component({
  selector: 'fdr-user-table',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    DropdownFilterComponent,
    SegmentedControlComponent,
    SkeletonComponent,
    EmptyStateComponent,
    PillComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-table.component.html',
  styleUrl: './user-table.component.scss',
})
export class UserTableComponent {
  private readonly userMockService = inject(UserMockService);
  private readonly dialogService = inject(DialogService);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly rolePillTones = ROLE_PILL_TONES;
  protected readonly roleLabels = USER_ROLE_LABELS;

  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly roleFilter = signal<readonly string[]>([]);
  protected readonly searchControl = this.formBuilder.nonNullable.control('');
  private readonly searchQuery = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(SEARCH_DEBOUNCE_MS)),
    { initialValue: '' },
  );

  protected readonly loading = signal(true);
  private readonly refreshTrigger = signal(0);

  protected readonly users = toSignal(
    combineLatest([
      toObservable(this.statusFilter),
      toObservable(this.roleFilter),
      toObservable(this.searchQuery),
      toObservable(this.refreshTrigger),
    ]).pipe(
      tap(() => this.loading.set(true)),
      switchMap(([status, roles, query]) => {
        const filters: UserListFilters = {
          status,
          roles: roles as readonly UserRole[],
          query,
        };
        return this.userMockService.list(filters);
      }),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: [] as readonly AppUser[] },
  );

  protected readonly hasResults = computed(() => this.users().length > 0);

  protected onRoleFilterChange(values: readonly string[]): void {
    this.roleFilter.set(values);
  }

  protected onSearchClear(): void {
    this.searchControl.setValue('');
    this.statusFilter.set('all');
    this.roleFilter.set([]);
  }

  protected formatLastAccess(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : DATE_FORMATTER.format(date);
  }

  protected createUser(): void {
    const dialogRef = this.dialogService.open<AppUser | undefined, void, CreateUserDialogComponent>(
      CreateUserDialogComponent,
    );
    dialogRef.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((created) => {
      if (!created) {
        return;
      }
      this.toastService.success(`Utilizador "${created.name}" criado.`);
      this.refreshTrigger.update((n) => n + 1);
    });
  }

  protected editRoles(user: AppUser): void {
    const dialogRef = this.dialogService.open<
      AppUser | undefined,
      { user: AppUser },
      EditRolesDialogComponent
    >(EditRolesDialogComponent, { data: { user } });
    dialogRef.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((updated) => {
      if (!updated) {
        return;
      }
      this.toastService.success(`Funções de "${updated.name}" atualizadas.`);
      this.refreshTrigger.update((n) => n + 1);
    });
  }

  protected activate(user: AppUser): void {
    this.mutate(this.userMockService.activate(user.id), `Conta de "${user.name}" ativada.`);
  }

  protected confirmDeactivate(user: AppUser): void {
    if (user.roles.includes('ADMIN') && this.userMockService.isLastAdminHolder(user.id)) {
      this.toastService.error(
        'Não é possível desativar o último utilizador com a função de administrador.',
      );
      return;
    }
    const data: ConfirmDialogData = {
      title: 'Desativar conta',
      message: `Tem a certeza de que pretende desativar a conta de "${user.name}"? Deixa de conseguir iniciar sessão.`,
      confirmLabel: 'Desativar',
    };
    const dialogRef = this.dialogService.open<boolean, ConfirmDialogData, ConfirmDialogComponent>(
      ConfirmDialogComponent,
      { data },
    );
    dialogRef.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.mutate(this.userMockService.deactivate(user.id), `Conta de "${user.name}" desativada.`);
    });
  }

  protected invalidateSessions(user: AppUser): void {
    this.userMockService
      .invalidateSessions(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.toastService.success(`Sessões de "${user.name}" invalidadas.`),
        error: (error: Error) => this.toastService.error(error.message),
      });
  }

  private mutate(source: Observable<AppUser>, successMessage: string): void {
    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toastService.success(successMessage);
        this.refreshTrigger.update((n) => n + 1);
      },
      error: (error: Error) => this.toastService.error(error.message),
    });
  }
}
