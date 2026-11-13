import type { MessageOptions, MessageType } from '../../src/core/types';
export type Message = [title: string, options?: MessageOptions & { type?: MessageType }];
