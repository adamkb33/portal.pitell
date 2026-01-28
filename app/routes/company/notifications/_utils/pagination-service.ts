import type { NavigateFunction } from 'react-router';

export class NotificationPaginationService {
  constructor(
    private readonly searchParams: URLSearchParams,
    private readonly navigate: NavigateFunction,
  ) {}

  handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(this.searchParams);
    params.set('page', String(newPage));
    this.navigate(`?${params.toString()}`, { replace: true, preventScrollReset: true });
  };

  handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(this.searchParams);
    params.set('size', String(newSize));
    params.set('page', '0');
    this.navigate(`?${params.toString()}`, { replace: true, preventScrollReset: true });
  };
}
