/* *
 *
 *  Data Layer
 *
 *  (c) 2012-2021 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Imports
 *
 * */

import type DataEventEmitter from './DataEventEmitter';

import DataConverter from './DataConverter.js';
import DataJSON from './DataJSON.js';
import DataPresentationState from './DataPresentationState.js';
import U from '../Core/Utilities.js';
const {
    addEvent,
    fireEvent,
    uniqueKey
} = U;

/* *
 *
 *  Class
 *
 * */

/**
 * Class to manage columns and rows in a table structure.
 */
class DataTable implements DataEventEmitter<DataTable.EventObject>, DataJSON.Class {

    /* *
     *
     *  Static Functions
     *
     * */

    /**
     * Converts a supported class JSON to a DataTable instance.
     *
     * @param {DataTable.ClassJSON} json
     * Class JSON (usually with a $class property) to convert.
     *
     * @param {DataConverter} [converter]
     * Converter for conversions of cell values.
     *
     * @return {DataTable}
     * DataTable instance from the class JSON.
     */
    public static fromJSON(
        json: DataTable.ClassJSON,
        converter?: DataConverter
    ): DataTable {
        const columns: DataTable.ColumnCollection = {},
            jsonColumns = json.columns,
            columnNames = Object.keys(jsonColumns);

        for (
            let i = 0,
                iEnd = columnNames.length,
                columnName: string,
                column: DataTable.Column,
                jsonColumn: DataTable.ColumnJSON;
            i < iEnd;
            ++i
        ) {
            columnName = columnNames[i];
            columns[columnName] = column = [];
            jsonColumn = jsonColumns[columnName];
            for (
                let j = 0,
                    jEnd = jsonColumn.length,
                    jsonCell: DataTable.ColumnJSON[0];
                j < jEnd;
                ++j
            ) {
                jsonCell = jsonColumn[j];
                if (typeof jsonCell === 'object' && jsonCell) {
                    column[j] = DataTable.fromJSON(jsonCell, converter);
                } else {
                    column[j] = jsonCell;
                }
            }
        }

        const table = new DataTable(
            columns,
            json.id,
            (
                json.presentationState &&
                DataPresentationState.fromJSON(json.presentationState)
            ),
            converter
        );

        if (json.aliasMap) {
            const aliasMap = (json.aliasMap || {}),
                aliases = Object.keys(aliasMap);

            for (
                let i = 0,
                    iEnd = aliases.length,
                    alias: string;
                i < iEnd;
                ++i
            ) {
                alias = aliases[i];
                table.aliasMap[alias] = aliasMap[alias];
            }
        }

        return table;
    }

    /* *
     *
     *  Constructors
     *
     * */


    /**
     * Constructs an instance of the DataTable class.
     *
     * @param {DataTable.ColumnCollection} [columns]
     * Record of columns.
     *
     * @param {string} [id]
     * DataTable identifier.
     *
     * @param {DataPresentationState} [presentationState]
     * Presentation state for the DataTable.
     *
     * @param {DataConverter} [converter]
     * Converter for conversions of cell values.
     */
    public constructor(
        columns: DataTable.ColumnCollection = {},
        id?: string,
        presentationState: DataPresentationState = new DataPresentationState(),
        converter: DataConverter = new DataConverter()
    ) {

        const myColumnNames = this.columnNames = Object.keys(columns);
        this.columns = {};
        this.converter = converter;
        this.id = id || uniqueKey();
        this.presentationState = presentationState;
        this.rowCount = 0;
        this.versionTag = '';

        if (myColumnNames.length) {
            const myColumns = this.columns;

            let column: DataTable.Column,
                columnName: string,
                maxRowCount: number = 0;

            for (let i = 0, iEnd = myColumnNames.length; i < iEnd; ++i) {
                columnName = myColumnNames[i];
                column = columns[columnName].slice();
                myColumns[columnName] = column;
                maxRowCount = Math.max(maxRowCount, column.length);
            }

            this.rowCount = maxRowCount;
        }
    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * A map of aliases for column names
     * [Alias]: columnName
     */
    public readonly aliasMap: Record<string, string> = {};

    /**
     * Converter for type conversions of cell values.
     */
    public readonly converter: DataConverter;

    private columnNames: Array<string>;

    private columns: Record<string, DataTable.Column>;

    public id: string;

    public readonly presentationState: DataPresentationState;

    private rowCount: number;

    private versionTag: string;

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Removes all columns and rows from this table.
     *
     * @param {DataEventEmitter.EventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @emits DataTable#clearTable
     * @emits DataTable#afterClearTable
     */
    public clear(eventDetail?: DataEventEmitter.EventDetail): void {
        const table = this;

        table.emit({ type: 'clearTable', detail: eventDetail });

        table.columns = {};
        table.columnNames.length = 0;
        table.rowCount = 0;

        table.emit({ type: 'afterClearTable', detail: eventDetail });
    }


    /**
     * Removes all cell values from a column.
     *
     * @param {string} columnNameOrAlias
     * Column name or alias to clear.
     *
     * @param {DataEventEmitter.EventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @emits DataTable#clearColumn
     * @emits DataTable#afterClearColumn
     */
    public clearColumn(
        columnNameOrAlias: string,
        eventDetail?: DataEventEmitter.EventDetail
    ): void {
        const table = this;

        columnNameOrAlias = (
            table.aliasMap[columnNameOrAlias] ||
            columnNameOrAlias
        );

        const column = table.columns[columnNameOrAlias];

        if (column) {
            const columnClone = column.slice();

            table.emit({
                type: 'clearColumn',
                column: columnClone,
                columnName: columnNameOrAlias,
                detail: eventDetail
            });

            column.length = 0;

            table.emit({
                type: 'afterClearColumn',
                column: columnClone,
                columnName: columnNameOrAlias,
                detail: eventDetail
            });
        }
    }

    /**
     * Removes all rows from this data table.
     *
     * @param {DataEventEmitter.EventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @emits DataTable#clearRows
     * @emits DataTable#afterClearRows
     */
    public clearRows(eventDetail?: DataEventEmitter.EventDetail): void {
        const table = this,
            columnNames = table.columnNames,
            columns = table.columns;

        table.emit({ type: 'clearRows', detail: eventDetail });

        table.rowCount = 0;
        for (let i = 0, iEnd = columnNames.length; i < iEnd; ++i) {
            columns[columnNames[i]].length = 0;
        }

        table.emit({ type: 'afterClearRows', detail: eventDetail });
    }

    /**
     * Returns a clone of this data table.
     *
     * @param {DataEventEmitter.EventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {DataTable}
     * Clone of this data table.
     *
     * @emits DataTable#cloneTable
     * @emits DataTable#afterCloneTable
     */
    public clone(eventDetail?: DataEventEmitter.EventDetail): DataTable {
        const table = this;

        table.emit({ type: 'cloneTable', detail: eventDetail });

        const tableClone = new DataTable(
                table.columns,
                table.id,
                table.presentationState,
                table.converter
            ),
            aliases = Object.keys(table.aliasMap);

        for (
            let k = 0,
                kEnd = aliases.length,
                alias: string;
            k < kEnd;
            ++k
        ) {
            alias = aliases[k];
            tableClone.aliasMap[alias] = table.aliasMap[alias];
        }

        if (table.hcEvents) {
            const eventNames = Object.keys(table.hcEvents);

            let eventName: DataTable.EventObject['type'],
                eventArr,
                eventFunction;

            for (let i = 0, iEnd = eventNames.length; i < iEnd; i++) {
                eventName = eventNames[i] as DataTable.EventObject['type'];
                eventArr = table.hcEvents[eventName];

                for (let j = 0, jEnd = eventArr.length; j < jEnd; j++) {
                    eventFunction = (eventArr[j] as any).fn;
                    tableClone.on(eventName, eventFunction);
                }
            }
        }

        table.emit({
            type: 'afterCloneTable',
            detail: eventDetail,
            tableClone
        });

        return tableClone;
    }

    /**
     * Deletes a column from the table.
     *
     * @param {string} columnName
     * Name (no alias) of column that shall be deleted.
     *
     * @param {DataEventEmitter.EventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {DataTable.Column|undefined}
     * Returns the deleted column, if found.
     *
     * @emits DataTable#deleteColumn
     * @emits DataTable#afterDeleteColumn
     */
    public deleteColumn(
        columnName: string,
        eventDetail?: DataEventEmitter.EventDetail
    ): (DataTable.Column|undefined) {
        const table = this,
            columnNames = table.columnNames,
            columns = table.columns,
            deletedColumn = columns[columnName];

        if (deletedColumn) {
            table.emit({
                type: 'deleteColumn',
                column: deletedColumn,
                columnName,
                detail: eventDetail
            });

            columnNames.splice(columnNames.indexOf(columnName), 1);
            delete columns[columnName];

            table.emit({
                type: 'afterDeleteColumn',
                column: deletedColumn,
                columnName,
                detail: eventDetail
            });

            return deletedColumn;
        }
    }

    /**
     * Deletes a column alias and returns the original column name.
     *
     * @param {string} alias
     * The alias to delete.
     *
     * @return {string|undefined}
     * Returns the original column name, if found.
     */
    public deleteColumnAlias(alias: string): (string|undefined) {
        const table = this,
            aliasMap = table.aliasMap,
            deletedAlias = aliasMap[alias];

        if (deletedAlias) {
            delete table.aliasMap[alias];
            return deletedAlias;
        }
    }

    /**
     * Deletes a row in this table.
     *
     * @param {number} rowIndex
     * Row index to delete.
     *
     * @param {DataEventEmitter.EventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {DataTable.Row|undefined}
     * Returns the deleted row, if found.
     *
     * @emits DataTable#deleteRow
     * @emits DataTable#afterDeleteRow
     */
    public deleteRow(
        rowIndex: number,
        eventDetail?: DataEventEmitter.EventDetail
    ): (DataTable.Row|undefined) {
        const table = this,
            columnNames = table.columnNames,
            columns = table.columns;

        if (rowIndex < table.rowCount) {
            const deletedRow: DataTable.Row = [];

            for (let i = 0, iEnd = columnNames.length; i < iEnd; ++i) {
                deletedRow.push(columns[columnNames[i]][rowIndex]);
            }

            table.emit({
                type: 'deleteRow',
                detail: eventDetail,
                row: deletedRow,
                rowIndex
            });

            for (let i = 0, iEnd = columnNames.length; i < iEnd; ++i) {
                deletedRow.push(...columns[columnNames[i]].splice(rowIndex, 1));
            }
            table.rowCount--;

            table.emit({
                type: 'afterDeleteRow',
                detail: eventDetail,
                row: deletedRow,
                rowIndex
            });

            return deletedRow;
        }
    }

    /**
     * Emits an event on this table to all registered callbacks of the given
     * event.
     *
     * @param {DataTable.EventObject} e
     * Event object with event information.
     */
    public emit(e: DataTable.EventObject): void {
        fireEvent(this, e.type, e);
    }

    /**
     * Returns a collection of all columns.
     *
     * @return {DataTable.ColumnCollection}
     * Collection of all columns.
     */
    public getAllColumns(): DataTable.ColumnCollection {
        const table = this,
            columnNames = table.columnNames,
            columns = table.columns,
            allColumns: DataTable.ColumnCollection = {};

        for (
            let i = 0,
                iEnd = columnNames.length,
                columnName: string;
            i < iEnd;
            ++i
        ) {
            columnName = columnNames[i];
            allColumns[columnName] = columns[columnName].slice();
        }

        return allColumns;
    }

    /**
     * Returns an array of all rows.
     *
     * @return {Array<DataTable.Row>}
     * Array of all rows.
     */
    public getAllRows(): Array<DataTable.Row> {
        const table = this,
            columns = table.columns,
            columnNames = table.columnNames,
            rows: Array<DataTable.Row> = [];

        for (
            let i = 0,
                iEnd = table.rowCount,
                row: Array<DataTable.CellType>;
            i < iEnd;
            ++i
        ) {
            row = [];
            for (let j = 0, jEnd = columnNames.length; j < jEnd; ++j) {
                row.push(columns[columnNames[j]][i]);
            }
            rows.push(row);
        }

        return rows;
    }

    /**
     * Retrieves the given column, either by the canonical column name, or by an
     * alias.
     *
     * @param {string} columnNameOrAlias
     * Name or alias of the column to get, alias takes precedence.
     *
     * @return {DataTable.Column|undefined}
     * A copy of the column, or `undefined` if not found.
     */
    public getColumn(
        columnNameOrAlias: string
    ): (DataTable.Column|undefined) {
        const table = this,
            columns = table.columns;

        columnNameOrAlias = (
            table.aliasMap[columnNameOrAlias] ||
            columnNameOrAlias
        );

        const column = columns[columnNameOrAlias];

        if (column) {
            return column.slice();
        }
    }

    /**
     * Retrieves the column aliases.
     *
     * @param {boolean} [usePresentationOrder]
     * Whether to use the column order of the presentation state.
     *
     * @return {Array<string>}
     * Column aliases.
     */
    public getColumnAliases(
        usePresentationOrder?: boolean
    ): Array<string> {
        const table = this,
            columnAliases = Object.keys(table.aliasMap);

        if (usePresentationOrder && columnAliases.length) {
            columnAliases.sort(table.presentationState.getColumnSorter());
        }

        return columnAliases;
    }

    /**
     * Retrieves the column names.
     *
     * @param {boolean} [usePresentationOrder]
     * Whether to use the column order of the presentation state.
     *
     * @return {Array<string>}
     * Column names.
     */
    public getColumnNames(
        usePresentationOrder?: boolean
    ): Array<string> {
        const table = this,
            columnNames = table.columnNames.slice();

        if (usePresentationOrder && columnNames.length) {
            columnNames.sort(table.presentationState.getColumnSorter());
        }

        return columnNames;
    }

    /**
     * Retrieves the given columns, either by column name or alias.
     *
     * @param {Array<string>} columnNamesOrAlias
     * Column names or aliases to retrieve. Aliases taking precedence.
     *
     * @return {DataTable.ColumnCollection}
     * Collection of requested columns. If a column was not found, it is
     * `undefined`.
     */
    public getColumns(
        columnNamesOrAlias: Array<string>
    ): DataTable.ColumnCollection {
        const table = this,
            aliasMap = table.aliasMap,
            columns = table.columns,
            fetchedColumns: DataTable.ColumnCollection = {};

        for (
            let i = 0,
                iEnd = columnNamesOrAlias.length,
                column: DataTable.Column,
                columnNameOrAlias: string;
            i < iEnd;
            ++i
        ) {
            columnNameOrAlias = columnNamesOrAlias[i];
            columnNameOrAlias = (
                aliasMap[columnNameOrAlias] ||
                columnNameOrAlias
            );
            column = columns[columnNameOrAlias];

            if (column) {
                fetchedColumns[columnNameOrAlias] = column.slice();
            }
        }

        return fetchedColumns;
    }

    /**
     * Retrieves the row with the given index.
     *
     * @param {number} rowIndex
     * Row index.
     *
     * @return {DataTable.Row}
     * Row values.
     */
    public getRow(
        rowIndex: number
    ): (DataTable.Row|undefined) {
        const table = this,
            columnNames = table.columnNames,
            columns = table.columns,
            row = new Array(columnNames.length);

        for (let i = 0, iEnd = columnNames.length; i < iEnd; ++i) {
            row[i] = columns[columnNames[i]][rowIndex];
        }

        return row;
    }

    /**
     * Returns the column value for the given row.
     *
     * @param {number} rowIndex
     * Row index to fetch.
     *
     * @param {string} columnNameOrAlias
     * Column name or alias to fetch.
     *
     * @return {DataTable.CellType}
     * Cell value for the row.
     */
    public getRowCell(
        rowIndex: number,
        columnNameOrAlias: string
    ): DataTable.CellType {
        const table = this;

        columnNameOrAlias = (
            table.aliasMap[columnNameOrAlias] ||
            columnNameOrAlias
        );

        const column = table.columns[columnNameOrAlias];

        if (column) {
            return column[rowIndex];
        }
    }

    /**
     * Returns the number of rows in this table.
     *
     * @return {number}
     * Number of rows in this table.
     *
     * @todo Consider implementation via property getter `.length` depending on
     *       browser support.
     */
    public getRowCount(): number {
        return this.rowCount;
    }

    /**
     * Retrieves the index of the first row matching a specific cell value.
     *
     * @param {string} columnNameOrAlias
     * Column to search in.
     *
     * @param {DataTable.CellType} cellValue
     * Cell value to search for. `NaN` and `undefined` are not supported.
     *
     * @param {number} [rowIndexOffset]
     * Index offset to start searching.
     *
     * @return {number|undefined}
     * Index of the first row matching the cell value.
     */
    public getRowIndexBy(
        columnNameOrAlias: string,
        cellValue: DataTable.CellType,
        rowIndexOffset?: number
    ): (number|undefined) {
        const table = this;

        columnNameOrAlias = (
            table.aliasMap[columnNameOrAlias] ||
            columnNameOrAlias
        );

        const column = table.columns[columnNameOrAlias];

        if (column) {
            const rowIndex = column.indexOf(cellValue, rowIndexOffset);

            if (rowIndex !== -1) {
                return rowIndex;
            }
        }
    }


    /**
     * Retrieves a number of rows.
     *
     * @param {number} [rowIndex]
     * Index of the first row to retrieve. Defaults to first row at index `0`.
     *
     * @param {number} [rowCount]
     * Number of rows to retrieve. Defaults to maximal number of rows.
     *
     * @return {DataTable.Row}
     * Returns retrieved rows.
     */
    public getRows(
        rowIndex: number = 0,
        rowCount: number = (this.rowCount - rowIndex)
    ): (Array<DataTable.Row>) {
        const table = this,
            columnNames = table.columnNames,
            columnNamesLength = columnNames.length,
            columns = table.columns,
            rows: Array<DataTable.Row> = new Array(rowCount);

        for (
            let i = rowIndex,
                i2 = 0,
                iEnd = Math.min(
                    table.rowCount,
                    (rowIndex + rowCount)
                );
            i < iEnd;
            ++i, ++i2
        ) {
            for (let j = 0, jEnd = columnNamesLength; j < jEnd; ++j) {
                rows[i2][j] = columns[columnNames[j]][i];
            }
        }

        return rows;
    }

    /**
     * Checks for a column name or alias.
     *
     * @param {string} columnNameOrAlias
     * Column name of alias to check.
     *
     * @return {boolean}
     * Returns `true` if found, otherwise `false`.
     */
    public hasColumn(columnNameOrAlias: string): boolean {
        const table = this;
        return (table.columnNames.indexOf(
            table.aliasMap[columnNameOrAlias] ||
            columnNameOrAlias
        ) !== -1);
    }

    /**
     * Searches for a specific cell value.
     *
     * @param {string} columnNameOrAlias
     * Column to search in.
     *
     * @param {DataTable.CellType} cellValue
     * Cell value to search for. `NaN` and `undefined` are not supported.
     *
     * @return {boolean}
     * True, if a row has been found, otherwise false.
     */
    public hasRowWith(
        columnNameOrAlias: string,
        cellValue: DataTable.CellType
    ): boolean {
        const table = this;

        columnNameOrAlias = (
            table.aliasMap[columnNameOrAlias] ||
            columnNameOrAlias
        );

        const column = table.columns[columnNameOrAlias];

        if (column) {
            return (column.indexOf(cellValue) !== -1);
        }

        return false;
    }

    /**
     * Registers a callback for a specific event.
     *
     * @param {string} type
     * Event type as a string.
     *
     * @param {DataEventEmitter.EventCallback} callback
     * Function to register for an event callback.
     *
     * @return {Function}
     * Function to unregister callback from the event.
     */
    public on(
        type: DataTable.EventObject['type'],
        callback: DataEventEmitter.EventCallback<this, DataTable.EventObject>
    ): Function {
        return addEvent(this, type, callback);
    }

    /**
     * Renames a column of cell values.
     *
     * @param {string} columnName
     * Name of the column to be renamed.
     *
     * @param {string} newColumnName
     * New name of the column. An existing column with the same name will be
     * replaced.
     *
     * @return {boolean}
     * Returns `true` if successful, `false` if the column was not found.
     */
    public renameColumn(
        columnName: string,
        newColumnName: string
    ): boolean {
        const table = this,
            columnNames = table.columnNames,
            columnIndex = columnNames.indexOf(columnName);

        if (columnIndex !== -1) {
            const aliasMap = table.aliasMap,
                columns = table.columns,
                newColumnIndex = columnNames.indexOf(newColumnName);

            if (aliasMap[newColumnName]) {
                delete aliasMap[newColumnName];
            }

            if (newColumnIndex === -1) {
                columnNames[columnIndex] = newColumnName;
            } else {
                columnNames.splice(columnIndex, 1);
            }

            columns[newColumnName] = columns[columnName];
            delete columns[columnName];

            return true;
        }

        return false;
    }

    /**
     * Sets a cell value based on the row index and column name or alias.
     *
     * @param {number|undefined} rowIndex
     * Row index to set.
     *
     * @param {string} columnNameOrAlias
     * Column name or alias to set.
     *
     * @param {DataTable.CellType} cellValue
     * Cell value to set.
     *
     * @param {DataEventEmitter.EventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {boolean}
     * `true` if successful, `false` if not
     *
     * @emits DataTable#setCell
     * @emits DataTable#afterSetCell
     */
    public setCell(
        rowIndex: number,
        columnNameOrAlias: string,
        cellValue: DataTable.CellType,
        eventDetail?: DataEventEmitter.EventDetail
    ): boolean {
        const table = this,
            columns = table.columns;

        columnNameOrAlias = (
            table.aliasMap[columnNameOrAlias] ||
            columnNameOrAlias
        );

        const column = columns[columnNameOrAlias];

        if (column) {
            table.emit({
                type: 'setCell',
                cellValue,
                columnName: columnNameOrAlias,
                detail: eventDetail,
                rowIndex
            });

            if (rowIndex >= table.rowCount) {
                table.rowCount = (rowIndex + 1);
            }

            column[rowIndex] = cellValue;

            table.emit({
                type: 'afterSetCell',
                cellValue,
                columnName: columnNameOrAlias,
                detail: eventDetail,
                rowIndex
            });

            return true;
        }

        return false;
    }

    /**
     * Sets cell values for a column. Will insert a new column, if not found.
     *
     * @param {string} columnNameOrAlias
     * Column name or alias to set.
     *
     * @param {DataTable.Column} [column]
     * Values to set in the column.
     *
     * @param {DataEventEmitter.EventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {boolean}
     * Returns `true` if successful, `false` if not.
     *
     * @emits DataTable#setColumn
     * @emits DataTable#afterSetColumn
     */
    public setColumn(
        columnNameOrAlias: string,
        column: DataTable.Column = [],
        eventDetail?: DataEventEmitter.EventDetail
    ): boolean {
        const table = this,
            columns = table.columns;

        columnNameOrAlias = (
            table.aliasMap[columnNameOrAlias] ||
            columnNameOrAlias
        );

        column = column.slice();

        table.emit({
            type: 'setColumn',
            column: column,
            columnName: columnNameOrAlias,
            detail: eventDetail
        });

        if (!columns[columnNameOrAlias]) {
            table.columnNames.push(columnNameOrAlias);
        }

        columns[columnNameOrAlias] = column;
        table.rowCount = Math.max(table.rowCount, column.length);

        table.emit({
            type: 'afterSetColumn',
            column: column,
            columnName: columnNameOrAlias,
            detail: eventDetail
        });

        return true;
    }

    /**
     * Defines an alias for a column.
     *
     * @param {string} columnAlias
     * Column alias to create.
     *
     * @param {string} columnName
     * Column name to create an alias for.
     *
     * @return {boolean}
     * True if successfully changed, false if reserved.
     */
    public setColumnAlias(
        columnAlias: string,
        columnName: string
    ): boolean {
        const aliasMap = this.aliasMap;

        if (!aliasMap[columnAlias]) {
            aliasMap[columnAlias] = columnName;
            return true;
        }

        return false;
    }

    /**
     * Sets cell values for multiple columns. Will insert new columns, if not
     * found.
     *
     * @param {DataTable.ColumnCollection} columns
     * Columns as a collection, where the keys are the column names or aliases.
     *
     * @param {DataEventEmitter.EventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {boolean}
     * Returns `true` if successful, `false` if not.
     *
     * @emits DataTable#setColumn
     * @emits DataTable#afterSetColumn
     */
    public setColumns(
        columns: DataTable.ColumnCollection,
        eventDetail?: DataEventEmitter.EventDetail
    ): boolean {
        const table = this,
            columnNames = Object.keys(columns);

        let failed = false;

        for (
            let i = 0,
                iEnd = columnNames.length,
                columnName: string;
            i < iEnd;
            ++i
        ) {
            columnName = columnNames[i];
            failed = (
                !table.setColumn(
                    columnName,
                    columns[columnName],
                    eventDetail
                ) ||
                failed
            );
        }

        return !failed;
    }

    /**
     * Sets cell values for a specifix row index. Will insert a new row, if no
     * index was provided, or if the index is higher than the total number of
     * rows.
     *
     * @param {DataTable.Row} row
     * Cell values of the row.
     *
     * @param {number} [rowIndex]
     * Index of the row to change. Leave `undefind` to add as a new row.
     *
     * @param {DataEventEmitter.EventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {boolean}
     * Returns `true` if successful, otherwise `false`.
     *
     * @emits DataTable#setRow
     * @emits DataTable#afterSetRow
     */
    public setRow(
        row: DataTable.Row,
        rowIndex: number = this.rowCount,
        eventDetail?: DataEventEmitter.EventDetail
    ): boolean {
        const table = this,
            columnNames = table.columnNames,
            columns = table.columns;

        table.emit({
            type: 'setRow',
            detail: eventDetail,
            row,
            rowIndex
        });

        if (rowIndex >= table.rowCount) {
            table.rowCount = (rowIndex + 1);
        }

        for (
            let i = 0,
                iEnd = row.length,
                column: DataTable.Column,
                columnName: string;
            i < iEnd;
            ++i
        ) {
            columnName = (columnNames[i] || `${i}`);
            column = columns[columnName];
            if (!column) {
                column = columns[columnName] = [];
                columnNames.push(columnName);
            }
            column[rowIndex] = row[i];
        }

        table.emit({
            type: 'afterSetRow',
            detail: eventDetail,
            row,
            rowIndex
        });

        return true;
    }

    /**
     * Sets cell values for multiple rows. Will insert new rows, if no
     * index was provided, or if the index is higher than the total number of
     * rows.
     *
     * @param {Array<DataTable.Row>} rows
     * Row values to insert.
     *
     * @param {number} [rowIndex]
     * Index of the row to change. Leave `undefind` to add as new rows.
     *
     * @param {DataEventEmitter.EventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {boolean}
     * Returns `true` if successful, otherwise `false`.
     *
     * @emits DataTable#setRow
     * @emits DataTable#afterSetRow
     */
    public setRows(
        rows: Array<DataTable.Row>,
        rowIndex: number = this.rowCount,
        eventDetail?: DataEventEmitter.EventDetail
    ): boolean {
        const table = this;

        let failed = false;

        for (
            let i = 0,
                i2 = rowIndex,
                iEnd = rows.length;
            i < iEnd;
            ++i, ++i2
        ) {
            failed = (
                !table.setRow(rows[i], i2, eventDetail) ||
                failed
            );
        }

        return !failed;
    }

    /**
     * Converts the table to a class JSON.
     *
     * @return {DataJSON.ClassJSON}
     * Class JSON of this table.
     */
    public toJSON(): DataTable.ClassJSON {
        const table = this,
            columnNames = table.columnNames,
            columns = table.columns,
            json: DataTable.ClassJSON = {
                $class: 'DataTable',
                columns: {},
                id: table.id
            },
            jsonColumns = json.columns,
            rowCount = table.rowCount;

        if (table.presentationState.isSet()) {
            json.presentationState = table.presentationState.toJSON();
        }

        for (
            let i = 0,
                iEnd = columnNames.length,
                columnName: string,
                column: DataTable.Column,
                jsonColumn: DataTable.ColumnJSON;
            i < iEnd;
            ++i
        ) {
            columnName = columnNames[i];
            column = columns[columnName];
            jsonColumns[columnName] = jsonColumn = [];
            for (
                let j = 0,
                    jEnd = rowCount,
                    cell: DataTable.CellType;
                j < jEnd;
                ++j
            ) {
                cell = column[j];
                if (typeof cell === 'object' && cell) {
                    jsonColumn[j] = cell.toJSON();
                } else {
                    jsonColumn[j] = cell;
                }
            }
        }

        return json;
    }

}

/* *
 *
 *  Class Prototype
 *
 * */

interface DataTable extends DataEventEmitter<DataTable.EventObject> {
    // nothing here yet
}

/* *
 *
 *  Class Namespace
 *
 * */

/**
 * Additionally it provides necessary types for events and JSON conversion.
 */
namespace DataTable {

    /**
     * Possible value types for a cell.
     */
    export type CellType = (DataTable|DataJSON.JSONPrimitive);

    /**
     * All information objects of DataTable events.
     */
    export type EventObject = (
        CellEventObject|
        ColumnEventObject|
        TableEventObject|
        RowEventObject
    );

    /**
     * Event object for cell-related events.
     */
    export interface CellEventObject extends DataEventEmitter.EventObject {
        readonly type: (
            'setCell'|'afterSetCell'
        );
        readonly cellValue: CellType;
        readonly columnName: string;
        readonly rowIndex: number;
    }

    /**
     * Class JSON of a DataTable.
     */
    export interface ClassJSON extends DataJSON.ClassJSON {
        aliasMap?: Record<string, string>;
        columns: ColumnCollectionJSON;
        id: string;
        presentationState?: DataPresentationState.ClassJSON;
    }

    /**
     * Array of column values.
     */
    export interface Column extends Array<DataTable.CellType> {
        [index: number]: CellType;
    }

    /**
     * JSON Array of column values.
     */
    export interface ColumnJSON extends DataJSON.JSONArray {
        [index: number]: (DataJSON.JSONPrimitive|ClassJSON);
    }

    /**
     * Record of columns, where the key is the column name or requested alias
     * and the value is an array of column values.
     */
    export interface ColumnCollection {
        [columnNameOrAlias: string]: Column;
    }

    /**
     * Record of columns, where the key is the column name or requested alias
     * and the value is an array of column values.
     */
    export interface ColumnCollectionJSON {
        [columnNameOrAlias: string]: ColumnJSON;
    }

    /**
     * Event object for column-related events.
     */
    export interface ColumnEventObject extends DataEventEmitter.EventObject {
        readonly type: (
            'clearColumn'|'afterClearColumn'|
            'deleteColumn'|'afterDeleteColumn'|
            'setColumn'|'afterSetColumn'
        );
        readonly column: Readonly<Column>;
        readonly columnName: string;
    }

    /**
     * Event object for table-related events.
     */
    export interface TableEventObject extends DataEventEmitter.EventObject {
        readonly type: (
            'clearTable'|'afterClearTable'|
            'clearRows'|'afterClearRows'|
            'cloneTable'|'afterCloneTable'
        );
        readonly tableClone?: DataTable;
    }

    /**
     * Array of row values. Index of the array is the index of the column names.
     */
    export interface Row extends Array<CellType> {
        [index: number]: CellType;
    }

    /**
     * Event object for row-related events.
     */
    export interface RowEventObject extends DataEventEmitter.EventObject {
        readonly type: (
            'deleteRow'|'afterDeleteRow'|
            'setRow'|'afterSetRow'
        );
        readonly row: Readonly<Row>;
        readonly rowIndex: number;
    }

}

/* *
 *
 *  Registry
 *
 * */

DataJSON.addClass(DataTable);

/* *
 *
 *  Default Export
 *
 * */

export default DataTable;
