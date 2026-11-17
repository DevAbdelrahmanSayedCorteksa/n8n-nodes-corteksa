export interface FieldOption {
	id?: string;
	label?: string;
	value?: string;
	is_closed?: boolean;
	is_active?: boolean;
}

export interface CorteksaField {
	slug: string;
	name: string;
	label?: string | null;
	type: string;
	required?: boolean;
	sort_order?: number;
	options?: { values?: FieldOption[] } | null;
	relation_type?: string | null;
	target_object_slug?: string | null;
	target_object_name?: string | null;
}

export interface Pagination {
	page?: number;
	totalPages?: number;
	nextPage?: number | null;
	hasMore?: boolean;
	nextCursor?: string | null;
}
