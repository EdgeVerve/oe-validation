# Oe-Validation

## Declaring validation rules
Validations are declared as part of a model definition along with rest of the model schema. Note that models can be created either by defining them in Model.json file or posting model schema on /modelDefinition API.

Validations can be attached to a model in following ways:

1. Property Level Validations
2. Embedded Model Validations
3. oeValidation Validations
4. Relation Validations
5. Custom Data Type Validations

## Conditional Error Return Option
Validation rules can be executed conditionally using this feature.
Whenever a validation rule is attached to a model, it gets executed by default on any data post and it validates all types of validation checks.

But if we want to return an error and if validation error is found at property level itself, then we can do this by setting an environment variable before starting the application i.e.
***SET RETURN_ON_PROP_VALIDATION=1***.

When ***RETURN_ON_PROP_VALIDATION*** is set as 1, the application will return error on property level validation itself. If the model does not have any error on the property level, then all levels of validations will be performed on the model data.

By default, ***RETURN_ON_PROP_VALIDATION*** is set as 0 and all levels of validations will be performed before returning an error.

## Property Level Validations
The property of a model alongside its metadata can have property level validations (i.e. Primitive validations) such as:

| ValidationType | AllowedValues/DataType | Description | Fail Condition |
| -------------- | ---------------------- | ----------- | -------------- |
| min | Number | Requires the property length to be more than or equal to the specified 'min' value if the property type is "string". In case the property is of type "number" it will check for its value. | Length or value of the property depending on its type, is less than the specified 'min'  value. |
| max | Number | Requires the property length to be less than or equal to the specified 'max' value if the property type is "string". In case the property is of type "number" it will check for its value. | Length or value of the property depending on its type, exceeds specified 'max' value. |
| is | Number | Requires the property length to be equal to the specified 'is' value if the property type is "string".In case the property is of type "number" it will check for its value. | Length or value of the property depending on its type, is more than or less than the specified 'is' value. |
| required | Boolean |Requires a model to include a property to be considered valid. |  Validated field is blank. |
| absence | Boolean | Requires a model to not include a property to be considered valid. | Validated field is not blank. |
| in | Array | Requires a value for property to be in the specified array. | value for the property not in the 'in' array. |
| notin | Array | Requires a value for property not to be in the specified array. | value for the property in 'notin' array. |
| numericality | 'integer'/'number' |***integer:*** Requires a value for the property to be an integer. ***number:*** Requires a value for the property to be a number. | ***integer:*** value for the property is not an integer. ***number:*** value for the property is not a number. |
| pattern | RegEx | Requires a value for the property to confer to the specified RegEx. | nonconformance to the RegEx. |
| unique | Boolean | Ensures the value of the property is unique for the model. | value is not unique for the model. |

Example
```
{
                    'name': 'StarWars',
                    'base': 'BaseEntity',
                    'strict': false,
                    'idInjection': true,
                    'options': {
                        'validateUpsert': true
                    },
                    'properties': {
                        'name': {
                            'type': 'string',
                            'unique': true,
                            'min': 4,
                            'max': 7
                        },
                        'numericField1': {
                            'type': 'number',
                            'numericality': 'integer'
                        },
                        'numericField2': {
                            'type': 'number',
                            'absence': true
                        },
                        'clan': {
                            'type': 'string',
                            'required': true
                        },
                        'country': {
                            'type': 'string',
                            'notin': ['England'],
                            'is': 8
                        },
                        'gender': {
                            'type': 'string',
                            'in': ['Male', 'Female'],
                            'required': false
                        },
                        'shipName': {
                            'type': 'string',
                            'pattern': '^[A-Za-z0-9-]+$'
                        }
                    },
                    'validations': [],
                    'relations': {},
                    'acls': [],
                    'methods': {}
}

```

### Composite Uniqueness
A group of properties can also be declared to be unique without making any of the property unique individually.
We use a parameter named ***scopedTo*** which takes an array of strings, whatever properties name you add here the group of properties will be unique.

Example
```
Below we have created a model named 'Hotel' which has three properties 'category', 'location' and 'name'.There is a composite uniqueness rule declared inside the property called 'name'.
This makes the group [name, category and location] unique.

Suppose we post the below data : 
{
  "category": "5",
  "location": "BLR",
  "name": "CROWN"
}

And if we re-post the above data it will fail as the combined data of the group [name, category and location] is unique.

If we post the below data it will be successful as the combined data of the group [name, category and location] is unique because the value of property 'category' is changed.

{
  "category": "7",
  "location": "BLR",
  "name": "CROWN"
}

Model :
{
  "name": "Hotel",
  "base": "BaseEntity",
  "plural": "hotels",
  "strict": false,
  "idInjection": true,
  "options": {
    "validateUpsert": true
  },
  "properties": {
    "category": {
      "type": "string",
      "required": true
    },
    "location": {
      "type": "string",
      "required": true
    },
    "name": {
      "type": "string",
      "required": true,
      "unique": {
        "scopedTo": ["location","category"]
      }
    }
  },
  "validations": [],
  "relations": {},
  "acls": [],
  "methods": {}
}

```

### Conditional Validation
Validation rules can be executed conditionally using this feature.
Whenever a validation rule is attached to a model, it gets executed by default on any data post.
But if we want to execute certain rules on some condition and not always then ***validateWhen*** can be used to specify that condition for that specific rule.
***validateWhen*** is declared inside a property.It takes the rule name as key and an expression as its value.

Example
```
"validateWhen": {
		"min": "(@mCustomer.age where accNo = @i.accountNumber) < 65",
		"required": "(@mCustomer.age where accNo = @i.accountNumber) < 65"
		}
```

For more information on validateWhen, please refer ***Expression Language*** documentation.

## Embedded Model Validations
There are cases when property level validation can have embedded model validation where the property type is another model or array of models. The validation in these cases are performed recursively wherein the validation of embedded models to the nth level can be performed using the attached validations of each model.

## oeValidation Validations
This is a special kind of validation which takes care of all the custom validation needs.
***oeValidations*** takes a rule object containing various rules which are individually used to create a set of validations to be applied on the model instance depending on the type of the specified rule.
This validation currently supports ***reference*** and ***custom*** rule type.

***NOTE :*** For oeValidations `validateWhen` will be a string instead of an object.

#### Reference Type
This type of oeValidation is mainly used for inter model validations.

Example
```
Model: Vehicle

{
                'name': 'Vehicle',
                'base': 'BaseEntity',
                'plural': 'vehicles',
                'strict': false,
                'idInjection': true,
                'options': {
                    'validateUpsert': true
                },
                'properties': {
                    'fuel': {
                        'type': 'string',
                        'required': true
                    }
                },
                'validations': [],
                'relations': {},
                'acls': [],
                'methods': {}
}

Model: Car
Car model uses oeValidation for an inter-model validation with Vehicle model. Here reference type is used.

{
                        'name': 'Car',
                        'base': 'BaseEntity',
                        'plural': 'cars',
                        'strict': false,
                        'idInjection': true,
                        'options': {
                            'validateUpsert': true
                        },
                        'properties': {
                            'name': {
                                'type': 'string',
                                'required': true
                            },
                            'fuelType': {
                                'type': 'string',
                                'required': true
                            }
                        },
                        'validations': [],
                        'oeValidations': {
                            'fuelCheck': {
                                'validateWhen': "",
                                'type': 'reference',
                                'errorCode': 'bag-err-001',
                                'refModel': 'Vehicle',
                                'refWhere': '{\"fuel\":\"{{fuelType}}\"}'
                            }
                        },
                        'relations': {},
                        'acls': [],
                        'methods': {}
}

```

#### Custom Type
This type of oeValidation can be used for ***inter-model*** as well as ***inter-property*** validations.

Example
```
"oeValidations": {
    "balanceCheck": {
        "validateWhen": "",
        "type": "custom",
        "errorCode": "balCheck-err-022",
        "expression": "(@mAccountBalance.Amount.Value where 
                        accountId =  @i.accountId)>@i.Amount.Value"
        }
    }

```
For more information on custom type oeValidation, please refer ***Expression Language*** documentation.

## Relation Validations
This validation when performed enforces the relationship constraints on model properties.
Relation validation can be applied for any of the following relations:

1. BelongsTo
2. HasAndBelongsToMany (Not Implemented)
3. Polymorphic (Not Implemented)

Example
```
Model: Hotel

{
                    'name': 'Hotel',
                    'base': 'BaseEntity',
                    'plural': 'hotels',
                    'strict': false,
                    'idInjection': true,
                    'options': {
                        'validateUpsert': true
                    },
                    'properties': {
                        'hotelName': {
                            'type': 'string',
                            'required': true
                        },
                        'hotelId': {
                            'type': 'number',
                            'required': true,
			    'id': true
                        }
                    },
                    'validations': [],
                    'relations': {},
                    'acls': [],
                    'methods': {}
}

Model: Room
Room model has a belongsTo relation with Hotel model.
{
                                'name': 'Room',
                                'base': 'BaseEntity',
                                'plural': 'rooms',
                                'strict': false,
                                'idInjection': true,
                                'options': {
                                    'validateUpsert': true
                                },
                                'properties': {
                                    'category': {
                                        'type': 'string',
                                        'required': true
                                    },
                                    'price': {
                                        'type': 'number',
                                        'required': true
                                    }
                                },
                                'validations': [],
                                'relations': {
                                    'sample_relation': {
                                        'type': 'belongsTo',
                                        'model': 'Hotel',
                                        'foreignKey': 'hotelRoomId'
                                    }
                                },
                                'acls': [],
                                'methods': {}
}

```

## Custom Data Type Validations

Not yet implemented

## Phases of Validation
Validation is a two phase process, i.e.

1. Building Validation: All the applied validations are cumulatively converted into a collection of functions and the resulting collection is attached to the model.
2. Performing Validation: The attached collection is evaluated against the model instance which decides whether the instance can be saved or discarded.

## Validation Error
Validation Error is a customized error object which gets created when one of the above mentioned validation fails. It contains a code, message and moreInformation.

Sample error response
```
    "status": 422,
    "txnId": "6026d8e0-006e-11e6-8c8c-4b200960df12",
    "requestId": "11009922",
    "errors": [
      {
        "code": "validation-err-011",
        "moreInformation": "http://localhost:1558/api/errorresponses/570c85c42460c92828ce46d4",
        "message": "Unique check violated, duplicate value exist"
      }
    ]

```

## Error Response and Custom Error

On server boot all the default error messages and codes are loaded into the application's context in ***`errorDetails`***.
We can customize the error message corresponding to an `error code` using the model ***Error***.

Whenever some error is encountered it will search for its customized message in ***Error*** model w.r.t the `error code`, if no entry is found it will fallback to default message corresponding to the error code in ***`errorDetails`***.
We can also add new error details(custom errors) to model ***Error***, which can be used anywhere in the application.

Model Error :
```
{
  "name": "Error",
  "base": "BaseEntity",
  "plural": "errors",
  "idInjection": false,
  "description": "This Model stores all the Customized error details",
  "options": {
    "validateUpsert": true,
    "isFrameworkModel": true
  },
  "properties": {
    "errCode": {
      "type": "string",
      "max": 100
    },
    "errMessage": {
      "type": "string",
      "max": 250
    },
    "moreInformation": {
      "type": "string",
      "max": 500
    }
  },
  "validations": [],
  "relations": {},
  "acls": [],
  "methods": {}
}

```