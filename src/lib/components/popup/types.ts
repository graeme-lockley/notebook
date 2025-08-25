// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LucideIcon = any;

export type Item<X> = {
	value: X;
	label: string;
	icon: LucideIcon;
};
