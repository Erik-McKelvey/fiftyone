"""
FiftyOne Server main

| Copyright 2017-2023, Voxel51, Inc.
| `voxel51.com <https://voxel51.com/>`_
|
"""
import argparse
import os

import asyncio
from hypercorn.asyncio import serve
from hypercorn.config import Config
import logging

if os.environ.get("FIFTYONE_ENABLE_DEBUG_LOGGING", False):
    logging.getLogger("asyncio").setLevel(logging.DEBUG)

if os.environ.get("FIFTYONE_DISABLE_SERVICES", False):
    del os.environ["FIFTYONE_DISABLE_SERVICES"]

os.environ["FIFTYONE_SERVER"] = "1"

import fiftyone as fo
import fiftyone.constants as foc

from fiftyone.server.app import app
from fiftyone.server.events import set_port


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=fo.config.default_app_port)
    parser.add_argument(
        "--address", type=str, default=fo.config.default_app_address
    )
    args = parser.parse_args()
    config = Config()
    config.bind = [f"{args.address}:{args.port}"]
    set_port(args.port)

    config.use_reloader = foc.DEV_INSTALL

    # # MY CODE

    # import fiftyone.zoo as foz
    # import numpy as np
    # import os
    # import PIL
    # import open3d as o3d
    # from IPython.core.debugger import set_trace
    # import fiftyone.utils.utils3d as fou3d

    # quickstart = foz.load_zoo_dataset(
    #     "quickstart", max_samples=5, drop_existing_dataset=True
    # )

    # quickstart_groups_pcd_only = fo.Dataset(
    #     name="quickstart_groups_pcd_only", overwrite=True
    # )
    # quickstart_groups = foz.load_zoo_dataset(
    #     name="quickstart-groups", max_samples=5, drop_existing_dataset=True
    # )

    # quickstart_groups.group_slice = "pcd"
    # samples = []
    # quickstart_groups_pcd_only.clear()

    # for sample in quickstart_groups:
    #     sample.clear_field("group")
    #     samples.append(sample)

    # quickstart_groups_pcd_only.add_samples(samples)

    # fou3d.compute_orthographic_projection_maps(
    #     quickstart_groups_pcd_only,
    #     (-1, 512),
    #     "/tmp/map",
    #     out_image_field="proj_bounds",
    # )

    asyncio.run(serve(app, config), debug=foc.DEV_INSTALL)
