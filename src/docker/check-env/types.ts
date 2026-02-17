export interface EnvVarOption {
	name: string;
	default: string;
}

export interface EnvCheckConfig {
	serviceName: string;
	required: string[];
	optional: EnvVarOption[];
}
