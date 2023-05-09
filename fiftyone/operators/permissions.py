"""
FiftyOne operator permissions.

| Copyright 2017-2023, Voxel51, Inc.
| `voxel51.com <https://voxel51.com/>`_
|
"""
from enum import Enum
from .registry import OperatorRegistry
from .loader import load_from_dir
from fiftyone.plugins.permissions import ManagedOperators


class PermissionedOperatorRegistry(OperatorRegistry):
    def __init__(self, managed_operators):
        self.managed_operators = managed_operators
        super().__init__()

    def can_execute(self, operator_uri):
        """Checks if the operator can be executed.

        Args:
            operator_uri: the URI of the operator

        Returns:
            ``True`` if the operator can be executed, ``False`` otherwise
        """
        return self.managed_operators.has_operator(operator_uri)

    @classmethod
    def from_list_request(cls, request):
        return PermissionedOperatorRegistry(
            ManagedOperators.for_request(request),
        )

    @classmethod
    def from_exec_request(cls, request, dataset_ids=None):
        return PermissionedOperatorRegistry(
            ManagedOperators.for_request(request, dataset_ids=dataset_ids),
        )
