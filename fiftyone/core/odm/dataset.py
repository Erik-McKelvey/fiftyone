"""
FiftyOne meta-datasets.

ODMDataset is a "meta dataset" database collection used to keep track of all
persistent datasets. Also relevant without persistence for actions like:

        list_dataset_names()


| Copyright 2017-2020, Voxel51, Inc.
| `voxel51.com <https://voxel51.com/>`_
|
"""
# pragma pylint: disable=redefined-builtin
# pragma pylint: disable=unused-wildcard-import
# pragma pylint: disable=wildcard-import
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals
from builtins import *
from future.utils import iteritems, itervalues

# pragma pylint: enable=redefined-builtin
# pragma pylint: enable=unused-wildcard-import
# pragma pylint: enable=wildcard-import

import logging

from mongoengine import (
    StringField,
    EmbeddedDocumentListField,
)

import eta.core.utils as etau

from .document import ODMDocument, ODMEmbeddedDocument

logger = logging.getLogger(__name__)


class SampleField(ODMEmbeddedDocument):
    name = StringField()
    ftype = StringField()
    subfield = StringField(null=True)
    embedded_doc_type = StringField(null=True)

    @classmethod
    def from_field(cls, field):
        """Creates a :class"`SampleField` from a field

        Args:
            field_name: string name of the field
            field: the field object

        Returns:
            a :class"`SampleField` instance
        """
        return cls(
            name=field.name,
            ftype=etau.get_class_name(field),
            subfield=(
                etau.get_class_name(field.field)
                if hasattr(field, "field")
                else None
            ),
            embedded_doc_type=(
                etau.get_class_name(field.document_type)
                if hasattr(field, "document_type")
                else None
            ),
        )

    @classmethod
    def list_from_field_schema(cls, d):
        """Creates a list of :class:`SampleField` objects from a field schema.

        Args:
             d: an ordered dict returned from:
                - dataset.get_sample_fields()
                - sample.get_field_schema()

        Returns:
             a list of :class:`SampleField` objects
        """
        return [
            cls.from_field(field)
            for field in itervalues(d)
            if field.name != "id"
        ]

    def matches_field(self, field):
        """Compares equivalence to a field object

        Args:
             field: a field object

        Returns:
            True if the field matches this object
        """
        if self.name != field.name:
            return False

        if self.ftype != etau.get_class_name(field):
            return False

        if self.subfield and self.subfield != etau.get_class_name(field.field):
            return False

        if (
            self.embedded_doc_type
            and self.embedded_doc_type
            != etau.get_class_name(field.document_type)
        ):
            return False

        return True


class ODMDataset(ODMDocument):
    """Meta-collection that tracks and persists datasets."""

    # The dataset name
    name = StringField(unique=True)

    # List of :class:`SampleField`, one for each field of the dataset.
    sample_fields = EmbeddedDocumentListField(document_type=SampleField)
