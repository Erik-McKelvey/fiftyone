import { Sample } from "@fiftyone/looker/src/state";
import {
  datasetFragment,
  datasetFragment$key,
  frameFieldsFragment,
  frameFieldsFragment$key,
  graphQLSyncFragmentAtom,
  mediaTypeFragment,
  mediaTypeFragment$key,
  sampleFieldsFragment,
  sampleFieldsFragment$key,
} from "@fiftyone/relay";
import { StrictField } from "@fiftyone/utilities";
import { DefaultValue, atom, atomFamily } from "recoil";
import { sessionAtom } from "../session";
import { collapseFields, transformDataset } from "../utils";
import { State } from "./types";

export interface AppSample extends Sample {
  _id: string;
  support?: [number, number];
}

export interface SampleData {
  sample: AppSample;
  aspectRatio: number;
  frameRate?: number;
  frameNumber?: number;
  urls: {
    [field: string]: string;
  };
}

export interface ModalNavigation {
  index: number;
  setIndex: (index: number) => void;
}

export interface ModalSample extends SampleData {
  navigation: ModalNavigation;
}

export const refresher = atom<number>({
  key: "refresher",
  default: 0,
});

// recoil effect that syncs state with local storage
export const getBrowserStorageEffectForKey =
  (
    key: string,
    props: {
      sessionStorage?: boolean;
      valueClass?: "string" | "number" | "boolean";
    } = { sessionStorage: false, valueClass: "string" }
  ) =>
  ({ setSelf, onSet }) => {
    const { valueClass, sessionStorage } = props;

    const storage = sessionStorage
      ? window.sessionStorage
      : window.localStorage;

    const value = storage.getItem(key);
    let procesedValue;

    if (valueClass === "number") {
      procesedValue = Number(value);
    } else if (valueClass === "boolean") {
      procesedValue = value === "true";
    } else {
      procesedValue = value;
    }

    if (value != null) setSelf(procesedValue);

    onSet((newValue, _oldValue, isReset) => {
      if (isReset) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, newValue);
      }
    });
  };

export const modal = (() => {
  let modal: ModalSample | null = null;
  return graphQLSyncFragmentAtom<datasetFragment$key, ModalSample | null>(
    {
      fragments: [datasetFragment],
      keys: ["dataset"],
      read: (data, previous) => {
        if (data.id !== previous?.id) {
          modal = null;
        }

        return modal;
      },
      default: null,
    },
    {
      key: "modal",
      effects: [
        ({ onSet }) => {
          onSet((value) => {
            modal = value;
          });
        },
      ],
    }
  );
})();

export interface SortResults {
  count: boolean;
  asc: boolean;
}

export const sortFilterResults = atomFamily<SortResults, boolean>({
  key: "sortFilterResults",
  default: {
    count: true,
    asc: false,
  },
});

export const cropToContent = atomFamily<boolean, boolean>({
  key: "cropToContent",
  default: true,
});

export const fullscreen = atom<boolean>({
  key: "fullscreen",
  default: false,
});

export const showOverlays = atom<boolean>({
  key: "showOverlays",
  default: true,
});

export const teams = atom({
  key: "teams",
  default: {
    open: false,
    submitted: false,
    minimized: false,
  },
});

export const activePlot = atom<string>({
  key: "activePlot",
  default: "Labels",
});

export const loading = atom<boolean>({
  key: "loading",
  default: false,
});

// labels: whether label tag or sample tag
export const tagging = atomFamily<boolean, { modal: boolean; labels: boolean }>(
  {
    key: "tagging",
    default: false,
  }
);

/**
 * The state of the current dataset. Contains informations about the dataset, and the samples contained in it.
 *
 * See :py:class:\`fiftyone.core.dataset.Dataset\` for python documentation.
 */
export const dataset = graphQLSyncFragmentAtom<
  datasetFragment$key,
  State.Dataset | null
>(
  {
    fragments: [datasetFragment],
    keys: ["dataset"],
    read: (dataset) => {
      return { ...transformDataset(dataset) };
    },
    default: null,
  },
  {
    key: "dataset",
  }
);

export const mediaType = graphQLSyncFragmentAtom<
  mediaTypeFragment$key,
  string | null
>(
  {
    fragments: [datasetFragment, mediaTypeFragment],
    keys: ["dataset"],
    read: (data) => data.mediaType,
    default: null,
  },
  {
    key: "mediaType",
  }
);

export const sampleFields = graphQLSyncFragmentAtom<
  sampleFieldsFragment$key,
  StrictField[]
>(
  {
    fragments: [datasetFragment, sampleFieldsFragment],
    keys: ["dataset"],
    read: (dataset) => collapseFields(dataset?.sampleFields || []),
    default: [],
  },
  {
    key: "sampleFields",
  }
);

export const frameFields = graphQLSyncFragmentAtom<
  frameFieldsFragment$key,
  StrictField[]
>(
  {
    fragments: [datasetFragment, frameFieldsFragment],
    keys: ["dataset"],
    read: (data) => collapseFields(data?.frameFields || []),
    default: [],
  },
  {
    key: "frameFields",
  }
);

export const selectedViewName = atom<string>({
  key: "selectedViewName",
  default: null,
});

export const selectedLabels = sessionAtom({
  key: "selectedLabels",
  default: [],
});

export const selectedSamples = sessionAtom({
  key: "selectedSamples",
  default: new Set<string>(),
});

export const selectedSampleObjects = atom<Map<string, Sample>>({
  key: "selectedSampleObjects",
  default: new Map(),
});

// only used in extended view, for tagging purpose
export const hiddenLabels = atom<State.SelectedLabelMap>({
  key: "hiddenLabels",
  default: {},
});

export const stageInfo = atom({
  key: "stageInfo",
  default: undefined,
});

export const viewCounter = atom({
  key: "viewCounter",
  default: 0,
});

export const DEFAULT_ALPHA = 0.7;

export const alpha = atomFamily<number, boolean>({
  key: "alpha",
  default: DEFAULT_ALPHA,
});

export const colorSeed = atomFamily<number, boolean>({
  key: "colorSeed",
  default: 0,
});

export const appTeamsIsOpen = atom({
  key: "appTeamsIsOpen",
  default: false,
});

export const savedLookerOptions = atom({
  key: "savedLookerOptions",
  default: {},
});

export const patching = atom<boolean>({
  key: "patching",
  default: false,
});

export const savingFilters = atom<boolean>({
  key: "savingFilters",
  default: false,
});

export const similaritySorting = atom<boolean>({
  key: "similaritySorting",
  default: false,
});

export const sidebarOverride = atom<string>({
  key: "sidebarOverride",
  default: null,
});

export const extendedSelection = (() => {
  let selection: { selection: string[]; scope?: string } = { selection: null };

  return graphQLSyncFragmentAtom<
    datasetFragment$key,
    { selection: string[]; scope?: string }
  >(
    {
      fragments: [datasetFragment],
      keys: ["dataset"],
      read: (data, previous) => {
        if (data.id !== previous?.id) {
          selection = { selection: null };
        }

        return selection;
      },
      default: { selection: null },
    },
    {
      key: "extendedSelection",
    }
  );
})();

export const extendedSelectionOverrideStage = atom<any>({
  key: "extendedSelectionOverrideStage",
  default: null,
});

export const similarityParameters = (() => {
  let update = false;
  let parameters: State.SortBySimilarityParameters | null = null;

  return graphQLSyncFragmentAtom<
    datasetFragment$key,
    State.SortBySimilarityParameters | null
  >(
    {
      fragments: [datasetFragment],
      keys: ["dataset"],
      read: (data, previous) => {
        if (data.id !== previous?.id && !update) {
          parameters = null;
        }
        update = false;

        return parameters;
      },
      default: null,
      selectorEffect: (newValue) => {
        update = true;
        parameters = newValue instanceof DefaultValue ? null : newValue;
      },
    },
    {
      key: "similarityParameters",
    }
  );
})();

export const modalTopBarVisible = atom<boolean>({
  key: "modalTopBarVisible",
  default: true,
});

export const hoveredSample = atom<Sample>({
  key: "hoveredSample",
  default: null,
});

export const lookerPanels = atom({
  key: "lookerPanels",
  default: {
    json: { isOpen: false },
    help: { isOpen: false },
  },
});

export const groupMediaIsCarouselVisible = atom<boolean>({
  key: "groupMediaIsCarouselVisible",
  default: true,
  effects: [
    getBrowserStorageEffectForKey("groupMediaIsCarouselVisible", {
      sessionStorage: true,
      valueClass: "boolean",
    }),
  ],
});

export const groupMediaIs3DVisible = atom<boolean>({
  key: "groupMediaIs3DVisible",
  default: true,
  effects: [
    getBrowserStorageEffectForKey("groupMediaIs3DVisible", {
      sessionStorage: true,
      valueClass: "boolean",
    }),
  ],
});

export const groupMediaIsImageVisible = atom<boolean>({
  key: "groupMediaIsImageVisible",
  default: true,
  effects: [
    getBrowserStorageEffectForKey("groupMediaIsImageVisible", {
      sessionStorage: true,
      valueClass: "boolean",
    }),
  ],
});

export const theme = atom<"dark" | "light">({
  key: "theme",
  default: "dark",
  effects: [getBrowserStorageEffectForKey("mui-mode")],
});

export const canEditSavedViews = sessionAtom({
  key: "canEditSavedViews",
  default: true,
});

export const readOnly = sessionAtom({
  key: "readOnly",
  default: false,
});

export const SPACES_DEFAULT = {
  id: "root",
  children: [
    {
      id: "default-samples-node",
      children: [],
      type: "Samples",
      pinned: true,
    },
  ],
  type: "panel-container",
  activeChild: "default-samples-node",
};

export const sessionSpaces = sessionAtom({
  key: "sessionSpaces",
  default: SPACES_DEFAULT,
});
