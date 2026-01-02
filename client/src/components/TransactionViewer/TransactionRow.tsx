import React from 'react';
import { TransactionRowProps } from './types';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction }) => (
  <tr className="hover:bg-gray-50">
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
      {formatDate(transaction.transaction_date)}
    </td>
    <td className="px-6 py-4 text-sm text-gray-900">
      <div className="font-medium">{transaction.description_1}</div>
      {transaction.description_2 && (
        <div className="text-gray-500 text-xs">{transaction.description_2}</div>
      )}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {transaction.account_type}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
      <span className={transaction.cad_amount < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
        {formatCurrency(transaction.cad_amount)}
      </span>
    </td>
  </tr>
);