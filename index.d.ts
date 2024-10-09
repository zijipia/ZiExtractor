import {
	BaseExtractor,
	SearchQueryType,
	Track,
	GuildQueueHistory,
	ExtractorInfo,
	ExtractorSearchContext,
	ExtractorStreamable,
	Playlist,
	Player,
	VoiceConnection,
} from "discord-player";
import { Readable } from "stream";
import { Client, User } from "discord.js";
interface ZiExtractorInit {
	createStream?: (info: Track) => Promise<Readable | string>;
}

declare class ZiExtractor extends BaseExtractor<ZiExtractorInit> {
	static identifier: string;
	static instance: ZiExtractor | null;
	protocols: string[];
	private _stream: (info: Track) => Promise<Readable | string>;

	constructor(options: ZiExtractorInit);

	activate(): Promise<void>;
	deactivate(): Promise<void>;
	validate(query: string, type?: SearchQueryType | null | undefined): boolean;
	handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
	handleYouTubeQuery(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
	handleNonYouTubeQuery(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
	fallbackToYouTubeSearch(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
	searchYouTube(query: string, context?: ExtractorSearchContext): Promise<Track[]>;
	handlePlaylist(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
	handleVideo(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
	getRelatedTracks(track: Track, history: GuildQueueHistory): Promise<ExtractorInfo>;
	stream(info: Track): Promise<ExtractorStreamable>;
	emptyResponse(): ExtractorInfo;
	createTrack(data: any, query: string, context: ExtractorSearchContext): Track;
	createYTTrack(video: any, context: ExtractorSearchContext, playlist?: Playlist | null): Track;
	private log(message: string): void;
}

interface SpeechOptions {
	ignoreBots?: boolean;
	minimalVoiceMessageDuration?: number;
	focusUser?: User;
	lang?: string;
	key?: string;
	profanityFilter?: boolean;
}

declare class ZiVoiceExtractor extends EventEmitter {
	constructor(speechOptions?: SpeechOptions);

	debug(message: string): void;
	handleSpeakingEvent(client: Client, connection: VoiceConnection, options: SpeechOptions): void;
	processVoiceCommand(
		client: Client,
		bufferData: Buffer[],
		user: User,
		connection: VoiceConnection,
		options: SpeechOptions,
	): Promise<void>;
	checkAudioQuality(pcmBuffer: Buffer): boolean;
	resolveSpeechWithGoogleSpeechV2(audioBuffer: Buffer, options: SpeechOptions): Promise<string>;
	convertStereoToMono(stereoBuffer: Buffer): Buffer;
}

declare function useZiVoiceExtractor(speechOptions?: SpeechOptions): ZiVoiceExtractor;

export { ZiExtractor, ZiVoiceExtractor, useZiVoiceExtractor };
