import { Block, FileBlockProps, FolderBlockProps } from "@githubnext/blocks";

import * as Callbacks from "./callbacks";
import * as Events from "./events";

export const init = (
  loadDevServerBlock?: (
    block: Block
  ) => Promise<(props: FileBlockProps | FolderBlockProps) => void>
) => {
  Callbacks.init();
  Events.init(loadDevServerBlock);
};
