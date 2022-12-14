import { Block, FileBlockProps, FolderBlockProps } from "@githubnext/blocks";
import { loadBundle, unloadBundle } from "./bundle";
import { callbackFunctions, callbackFunctionsInternal } from "./callbacks";

const init = (
  loadDevServerBlock?: (
    block: Block
  ) => Promise<(props: FileBlockProps | FolderBlockProps) => void>
) => {
  let bundle: undefined | null | { name: string; content: string }[] =
    undefined;
  let setBlockProps:
    | undefined
    | ((props: FileBlockProps | FolderBlockProps) => void);
  let props: FileBlockProps | FolderBlockProps;

  const onMessage = async (event: MessageEvent) => {
    const { data } = event;

    if (data.type !== "setProps") return;

    // the `setProps` protocol is pretty ad-hoc (see `use-block-frame-messages.ts`):
    //   `{ bundle: null }` means the block was not found
    //   `{ bundle: [] }` means the block is from the dev server (load it locally)
    //   `{ bundle: [...] }` means the block is not from the dev server (load the bundle code)
    //   `{ props: ... }` means render the block with new props
    // `setProps` with `bundle` is called once, then `setProps` with `props` one or more times

    if ("bundle" in data.props) {
      // clear old bundle state
      setBlockProps = undefined;
      unloadBundle();
      bundle = data.props.bundle;
    } else if (data.props.props) {
      props = data.props.props;
    }

    if (!setBlockProps && bundle && props) {
      setBlockProps = await loadBundle(bundle, props.block, loadDevServerBlock);
    }

    const root = document.getElementById("root")!;

    if (
      root.children.length === 1 &&
      (root.children[0].id === "__loading__" ||
        root.children[0].id === "__not_found__")
    ) {
      root.removeChild(root.children[0]);
    }

    if (bundle === null || !setBlockProps) {
      const div = document.createElement("div");
      div.id = bundle === null ? "__not_found__" : "__loading__";
      div.style.width = "100%";
      div.style.height = "100%";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.style.color = "#ddd";
      div.style.fontStyle = "italic";
      const text = document.createTextNode(
        bundle === null ? "Block not found" : "Loading..."
      );
      div.appendChild(text);
      root.appendChild(div);
    } else {
      const wrappedSetBlockProps = (
        props: FileBlockProps | FolderBlockProps
      ) => {
        if (!setBlockProps) return;
        const isInternal =
          (props as unknown as { block: Block }).block.owner === "githubnext";
        const filteredCallbackFunctions = isInternal
          ? callbackFunctionsInternal
          : callbackFunctions;
        const onUpdateContent = (content: string) => {
          // the app does not send async content updates back to the block that
          // originated them, to avoid overwriting subsequent changes; we update the
          // content locally so controlled components work. this doesn't overwrite
          // subsequent changes because it's synchronous.
          props = { ...props, content };
          wrappedSetBlockProps(props);
          filteredCallbackFunctions["onUpdateContent"](content);
        };
        setBlockProps({
          ...props,
          ...filteredCallbackFunctions,
          onUpdateContent,
        });
      };
      wrappedSetBlockProps(props);
    }
  };
  addEventListener("message", onMessage);

  const onLoad = () => {
    // TODO(jaked)
    // clear previous block bundle if the block has changed
    window.top?.postMessage(
      {
        type: "loaded",
        hash: window.location.hash,
      },
      "*"
    );
  };
  onLoad();
  addEventListener("hashchange", onLoad);
};

export { init };
