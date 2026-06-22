import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { WebsocketService } from '../../../../../core/services/websocket.service';
import { ManagementTicket, ManagementTicketQuery } from '../models/management-ticket.models';
import { ManagementTicketService } from '../services/management-ticket.service';

const DEFAULT_QUERY: ManagementTicketQuery = {
  page: 0,
  size: 10,
  status: 'ALL',
  priority: 'ALL',
  assigneeEmail: 'ALL',
  customerEmail: '',
  search: '',
  startDate: null,
  endDate: null,
};

interface ManagementTicketsState {
  tickets: ManagementTicket[];
  query: ManagementTicketQuery;
  totalElements: number;
  totalPages: number;
  loading: boolean;
  selectedTicket: ManagementTicket | null;
  errorMessage: string | null;
}

const INITIAL_STATE: ManagementTicketsState = {
  tickets: [],
  query: DEFAULT_QUERY,
  totalElements: 0,
  totalPages: 0,
  loading: false,
  selectedTicket: null,
  errorMessage: null,
};

export const ManagementTicketsStore = signalStore(
  withState<ManagementTicketsState>(INITIAL_STATE),
  withComputed(({ query, totalElements, totalPages, tickets }) => ({
    pageStart: computed(() => totalElements() === 0 ? 0 : query().page * query().size + 1),
    pageEnd: computed(() => Math.min((query().page + 1) * query().size, totalElements())),
    canGoPrevious: computed(() => query().page > 0),
    canGoNext: computed(() => query().page + 1 < totalPages()),
    openTicketCount: computed(() => tickets().filter(ticket => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS').length),
  })),
  withMethods((store, service = inject(ManagementTicketService), websocketService = inject(WebsocketService)) => {
    let ticketSubscription: { unsubscribe: () => void } | null = null;

    const loadTickets = rxMethod<Partial<ManagementTicketQuery> | void>(
      pipe(
        tap((partial) => {
          const nextQuery = { ...store.query(), ...(partial || {}) };
          patchState(store, { query: nextQuery, loading: true, errorMessage: null });
        }),
        switchMap(() => service.getTickets(store.query()).pipe(
          tap({
            next: page => patchState(store, {
              tickets: page.content || [],
              totalElements: page.totalElements,
              totalPages: page.totalPages,
              query: { ...store.query(), page: page.page, size: page.size },
              loading: false,
            }),
            error: () => patchState(store, { loading: false, errorMessage: 'Không thể tải danh sách ticket hỗ trợ.' }),
          }),
          catchError(() => EMPTY)
        ))
      )
    );

    return {
      loadTickets,
      setSearch(search: string): void {
        loadTickets({ search, page: 0 });
      },
      setCustomerEmail(customerEmail: string): void {
        loadTickets({ customerEmail, page: 0 });
      },
      setStatus(status: ManagementTicketQuery['status']): void {
        loadTickets({ status, page: 0 });
      },
      setPriority(priority: ManagementTicketQuery['priority']): void {
        loadTickets({ priority, page: 0 });
      },
      setAssigneeEmail(assigneeEmail: string): void {
        loadTickets({ assigneeEmail, page: 0 });
      },
      setDateRange(startDate: string | null, endDate: string | null): void {
        loadTickets({ startDate, endDate, page: 0 });
      },
      resetFilters(customerEmail = ''): void {
        loadTickets({
          page: 0,
          search: '',
          customerEmail,
          status: 'ALL',
          priority: 'ALL',
          assigneeEmail: 'ALL',
          startDate: null,
          endDate: null,
        });
      },
      setPage(page: number): void {
        loadTickets({ page });
      },
      setSize(size: number): void {
        loadTickets({ size, page: 0 });
      },
      selectTicket(ticket: ManagementTicket | null): void {
        patchState(store, { selectedTicket: ticket });
      },
      connectRealtime(): void {
        websocketService.connect();
        ticketSubscription?.unsubscribe();
        ticketSubscription = websocketService.subscribe('/topic/admin.tickets').subscribe(() => loadTickets());
      },
      disconnectRealtime(): void {
        ticketSubscription?.unsubscribe();
        ticketSubscription = null;
      },
    };
  })
);
