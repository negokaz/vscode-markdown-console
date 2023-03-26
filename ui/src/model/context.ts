import { Messages } from "@ui/i18n/messages";
import { createContext } from "preact";

export type Mode = 'runnable' | 'preview';

export const ModeContext = createContext('runnable' as Mode);

export const MessageContext = createContext(new Messages('en'));
