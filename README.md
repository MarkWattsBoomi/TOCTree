![Toc Image](https://github.com/MarkWattsBoomi/TOCTree/blob/main/toc.png)

This module provides a tree view to display hierarchical data and allow editing and re-ordering.

The latest version can be included in your player from this location: -

```
https://files-manywho-com.s3.amazonaws.com/e1dbcceb-070c-4ce6-95b0-ba282aaf4f48/toc.js
https://files-manywho-com.s3.amazonaws.com/e1dbcceb-070c-4ce6-95b0-ba282aaf4f48/toc.css
```

# Class Names

toc

# TOC

## Functionality

The component will display a hierarchical tree of the data with no limit on hierarchical levels

Each node can be collapsed and expanded

Tools at the top allow complete collapse and expand

Each node is shown with the ITEM_NAME attribute value and the ITEM_DESCRIPTION attribute as its tool tip.

The tree will parse the list of nodes and construct the hierarchical model based on the PARENT_ID.

If a node has no PARENT_ID or that PARENT_ID is not found in another row's ITEM_ID then that row becomes a root / base node.

The tree takes the selected item from the state and will expand the tree to that element and highlight it.

Searching will find any matching nodes and expand to ensure they are visible.

Searching requires a minimum of 4 characters in the box and limits the results to MaxSearchResults.

Searching searches in both the ITEM_NAME & ITEM_DESCRIPTION

## Enable / Disable

The nodes in the tree can be flagged as enabled or disabled by setting a known value on the item's ITEM_STATUS attribute.

If empty or null then the default is FALSE

A value of "LOCKED" or "DISABLED": or "READONLY" will make the node disabled.

A value of null or "" or "UNLOCKED" or "ENABLED" or "EDITABLE" or "WRITABLE" will set the node as editable

If a node is not editable then all buttons and context menu items are removed.

Also the value of the ITEM_STATUS will be added to the node's base element as a CSS class prefixed with "nodestyle_" e.g. DISABLED = "nodestyle_disabled".

This allows visual modification of the node through CSS based on its status.


## Drag & Drop

Nodes can be dragged and dropped onto other nodes or between them.



## Outcomes

Any outcome attached to the component is dealt with in this way: -

* If the outcome is set as "Appears At Top" then it will become a button in the top title bar or its context menu otherwise it becomes a button on the tree node or its context menu.

* If the outcome has its "When this outcome is selected" option set to either "Save Changes" or "Partially Save Changes" and is attached 
to a tree node then the current node is set as the state value when triggered.

* If the outcome has an "icon" attribute then this value is used to specify the icon, otherwise a default "+" icon is used.  Note: Icons are 
bootstrap glyphicons without the "glyphicon-" prefix e.g. "trash","edit" etc.

* If the outcome has a "Label" set then this is used as the tooltip otherwise the outcome's name is used.

* "OnSelect" is a special case and is attached to the action of clicking a tree node.

* If the outcome's developer name begins with "CM" (case insensitive) then the outcome is added to either the main tree or the current node's context menu rather than as a button.

* All outcomes including "OnSelect" are optional.

* Outcome order is respected.  

* The expand and contract default buttons in the title bar are given order 10 & 20 respectively to allow for controlling button display order and injecting your outcome around them.

## Outcome Attributes

### icon

Sets the glyphicon to show for the outcome.


## Settings

### Label

The Label of the component is used as the title bar

### Width & Height

If specified then these are applied as pixel values.

### Read Only

Sets whether drag and drop of nodes is enabled and addition & deletion.

### Searchable

If true then the seach box is shown in title bar



## Component Attributes

### classes

Like all components, adding a "classes" attribute will cause that string to be added to the base component's class value

### DebugLevel

Setting this enables extra output in the console and on screen.  It's a number,  error = 0, warning = 1, info = 2, verbose = 3

info / 2 for example will display the node's id & parent in the tree

### ModifiedState

The name of a field which is a list of the same type as the model.

It will receive any changed tree nodes.

### SelectedState

The name of a field which is an object of the same type as the model.

It will receive the currently selected node from the tree.

### MaxResults

Setting this attribute to a number e.g. 20 will set the level at which a search will truncate the results and show a warning.  Default if not specified = 30.

### StartExpanded

Setting this attribute to "true" will show the tree initially fully expanded.  Default = false

### LowestOnly

If present and set to "true" then only the lowest level tree nodes will show buttons or context menu items for this outcome


### AutoNumber

if "true" then a level based numbering is shown e.g. 1.1.12 etc.  This is auto generated and updated on re-order.

### DefaultIcon

The name of a bootstrap icon to be used by default.

Defaults to "record"

### IdField

Mandatory

Number

The name of the field on the model containing the item's id

Defaults to ITEM_ID

### ParentField

Mandatory

Number

The name of the field containing the corresponding id of the node's parent

Defaults to PARENT_ID

### SequenceField

Mandatory

Number

Denotes this items order in the parent, updated on re-order

Defaults to SEQUENCE

### TitleField

Mandatory

String

The name of the field containing the node's display text

Defaults to TITLE

### DescriptionField

Optional

String

The name o the field containing the hover tooltip text for the node

Defaults to DESCRIPTION

### CountField

Optional

The name of the field containing an optional count number used to indicate the number of child nodes

Defaults to COUNT

### IconField

Optional

The name of the field containing the specific bootstrap glyphicon name to show by this node

Defaults to ICON


## Styling

All elements of the tree can be styled by adding the specific style names to your player.


## Page Conditions

The component respects the show / hide rules applied by the containing page.


## Data Model

The component requires a list of items of any type.

The actual names of the type in flow doesn't or do the attribute names since they can be controlled in the attributes.


## State Value

A list of items of the same type as the model.

This will be set to the entire model contents including any updated values.

Can be set to the same value as the model !!!

