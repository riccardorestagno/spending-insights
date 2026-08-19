import { DateRangePresetId } from '../../utils/dateRanges';

export enum TransactionType {
  Debit = 'debit',
  Credit = 'credit',
  All = 'all',
}

export enum SortOrder {
  Ascending = 'asc',
  Descending = 'desc'
}

export interface Transaction {
  id: string | number;
  transaction_date: string;
  description_1: string;
  description_2?: string;
  account_type: string;
  cad_amount: number;
  category: Category;
  is_reimbursed: boolean;
}

export interface Category {
  value: string;
  description: string;
  transaction_count: number;
  total: number;
}

export interface Metadata {
  page: number;
  total_pages: number;
  total_items: number;
  category_total: number;
}

export interface FilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  startDate: string;
  endDate: string;
  datePreset: DateRangePresetId;
  onDatePresetChange: (preset: DateRangePresetId) => void;
  onStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  transactionType: TransactionType;
  onTransactionTypeChange: (type: TransactionType) => void;
  metadata: Metadata | null;
}

export interface TableHeaderProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export interface TransactionRowProps {
  transaction: Transaction;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface TransactionsTableProps {
  transactions: Transaction[];
  loading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
  metadata: Metadata | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  categories: Category[];
}

export interface CategorySummaryProps {
  metadata: Metadata | null;
}
export interface DateRangeFilterProps {
  preset: DateRangePresetId;
  startDate: string;
  endDate: string;
  onPresetChange: (preset: DateRangePresetId) => void;
  onStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}export interface FilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearDates: () => void;
  transactionType: TransactionType;
  onTransactionTypeChange: (type: TransactionType) => void;
  metadata: Metadata | null;
}

export interface TableHeaderProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export interface TransactionRowProps {
  transaction: Transaction;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface TransactionsTableProps {
  transactions: Transaction[];
  loading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
  metadata: Metadata | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  categories: Category[];
}

export interface CategorySummaryProps {
  metadata: Metadata | null;
}
